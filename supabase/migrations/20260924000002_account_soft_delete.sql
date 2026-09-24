-- =============================================================================
-- Deleting an account becomes reversible.
--
-- Until now "delete my account" removed the auth user outright, and everything
-- the coach had — profile, offers, bookings, clients, availabilities — went
-- with it through the foreign keys. One click, nothing to come back to.
--
-- Now the click only marks the profile. The account stops working the same
-- minute — the dashboard closes, the public page stops resolving — but the
-- rows stay, so a coach who changes their mind (or deleted by accident) can be
-- brought back by hand from the console. After 30 days a nightly job performs
-- the real deletion, the same cascade as before.
--
-- deleted_at is deliberately its own column rather than a flavour of
-- suspended_at: the two say different things (a decision taken about a coach,
-- versus a decision taken by them), they are undone by different people, and
-- only one of them ends in a purge.
-- =============================================================================

alter table public.profiles
  add column deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'The coach asked for their account to be deleted. Access stops immediately; '
  'purge_deleted_accounts() removes the auth user 30 days later, which cascades '
  'to everything else. Cleared by a platform admin to bring the account back.';

create index profiles_deleted_idx on public.profiles (deleted_at) where deleted_at is not null;

/**
 * Stamped when the J-7 warning has been sent, so it goes out once.
 *
 * Cleared whenever deleted_at is set or cleared: a coach who leaves, comes
 * back, and leaves again gets warned again.
 */
alter table public.profiles
  add column deletion_warned_at timestamptz;

-- The public view already hides suspended profiles; a deleted one goes too.
create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, social_links,
    location, calendar_visible, custom_closed_message, theme, locale, timezone, currency,
    case when coalesce((contact_channels ->> 'whatsapp')::boolean, false)
      then whatsapp_number else null end as whatsapp_number,
    case when coalesce((contact_channels ->> 'email')::boolean, false)
      then contact_email else null end as contact_email,
    case when coalesce((contact_channels ->> 'phone')::boolean, false)
      then phone_number else null end as phone_number
  from public.profiles p
  where onboarding_completed_at is not null
    and suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- -----------------------------------------------------------------------------
-- The purge.
--
-- Deleting the auth user is what cascades: profiles.user_id carries ON DELETE
-- CASCADE, and everything else hangs off the profile. The function therefore
-- does exactly what the old button did — only 30 days later, and only for
-- accounts still marked as deleted.
-- -----------------------------------------------------------------------------
create or replace function public.purge_deleted_accounts(p_grace_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with purged as (
    delete from auth.users u
     where u.id in (
       select p.user_id
         from public.profiles p
        where p.deleted_at is not null
          and p.deleted_at <= now() - make_interval(days => p_grace_days)
     )
    returning u.id
  )
  select count(*) into v_count from purged;

  return v_count;
end;
$$;

-- Nobody but the scheduler calls this: pg_cron runs it as the owner, and no
-- API role should be able to trigger a permanent deletion.
revoke execute on function public.purge_deleted_accounts(integer) from public, anon, authenticated;

-- Nightly, at a quiet hour. The grace period is stated three times and the
-- three must agree: this default, DELETION_GRACE_DAYS in src/lib/account/
-- deletion.ts, and the copy the coach reads before confirming.
select cron.schedule(
  'thesessionlink-purge-deleted-accounts',
  '30 3 * * *',
  'select public.purge_deleted_accounts()'
);

-- -----------------------------------------------------------------------------
-- The console records restoring an account like any other intervention.
-- -----------------------------------------------------------------------------
alter table public.admin_audit_log drop constraint admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (action in (
    'extend_trial', 'set_subscription', 'suspend', 'unsuspend',
    'impersonate_start', 'impersonate_stop', 'restore_account'
  ));

-- -----------------------------------------------------------------------------
-- The console needs to see who is on their way out. Appending the column keeps
-- the view replaceable; the counters and the rest are untouched.
-- -----------------------------------------------------------------------------
create or replace view public.admin_coach_overview
with (security_invoker = true) as
  select
    p.id,
    p.user_id,
    p.display_name,
    p.slug,
    -- Set from the account's email at signup; the console searches on it.
    p.contact_email,
    p.locale,
    p.created_at,
    p.onboarding_completed_at,
    p.trial_ends_at,
    p.subscription_active,
    p.suspended_at,
    p.suspension_reason,
    p.category_id,
    c.name as category_name,
    (select count(*) from public.offers o where o.profile_id = p.id)::integer as offers_count,
    (select count(*) from public.bookings b where b.profile_id = p.id)::integer as bookings_count,
    (select max(b.created_at) from public.bookings b where b.profile_id = p.id) as last_booking_at,
    p.deleted_at
  from public.profiles p
  left join public.activity_categories c on c.id = p.category_id;

revoke all on public.admin_coach_overview from anon, authenticated;
grant select on public.admin_coach_overview to authenticated;

-- -----------------------------------------------------------------------------
-- What the outside world is told about an account that is gone.
--
-- The public view simply stops returning the row, which would leave the page
-- as a bare 404 — the same answer as a link that never existed. This says
-- instead that the professional is no longer here, without saying whether they
-- left or were suspended: the visitor gets one neutral message either way.
--
-- It returns a boolean and nothing else, so it discloses no more than the slug
-- check already does when someone picks their link at signup.
-- -----------------------------------------------------------------------------
create or replace function public.profile_unavailable(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.slug = lower(p_slug)
       and p.onboarding_completed_at is not null
       and (p.suspended_at is not null or p.deleted_at is not null)
  );
$$;

revoke execute on function public.profile_unavailable(text) from public;
grant execute on function public.profile_unavailable(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- The warning, seven days before the purge.
--
-- Same shape as claim_due_reminders: the claim stamps the rows it returns, so
-- two concurrent runs never send twice, and the caller clears the stamp again
-- when a send fails so the next run retries it.
-- -----------------------------------------------------------------------------
create or replace function public.claim_due_deletion_warnings(
  p_grace_days integer default 30,
  p_warn_days  integer default 7,
  p_limit      integer default 50
)
returns setof public.profiles
language sql
security definer
set search_path = ''
as $$
  update public.profiles p
     set deletion_warned_at = now()
   where p.id in (
     select p2.id
       from public.profiles p2
      where p2.deleted_at is not null
        and p2.deletion_warned_at is null
        and p2.deleted_at <= now() - make_interval(days => p_grace_days - p_warn_days)
      order by p2.deleted_at
      limit p_limit
      for update of p2 skip locked
   )
  returning p.*;
$$;

revoke execute on function public.claim_due_deletion_warnings(integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_deletion_warnings(integer, integer, integer)
  to service_role;

/**
 * Pings the app once a day so it can send the warnings through Resend, the
 * same way dispatch_reminders() does. Unconfigured project: it no-ops.
 */
create or replace function public.dispatch_deletion_warnings()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app_url text;
  v_secret  text;
begin
  select decrypted_secret into v_app_url from vault.decrypted_secrets where name = 'app_url';
  select decrypted_secret into v_secret  from vault.decrypted_secrets where name = 'cron_secret';

  if v_app_url is null or v_secret is null then
    return; -- not configured yet
  end if;

  perform net.http_post(
    url := rtrim(v_app_url, '/') || '/api/cron/deletion-warnings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.dispatch_deletion_warnings() from public, anon, authenticated;

-- An hour before the purge runs, so a warning is never sent on the same night
-- an account is erased.
select cron.schedule(
  'thesessionlink-deletion-warnings',
  '30 2 * * *',
  'select public.dispatch_deletion_warnings()'
);
