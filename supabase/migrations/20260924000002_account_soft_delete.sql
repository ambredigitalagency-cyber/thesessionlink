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
-- No reminder goes out for an account on its way out.
--
-- Without this, a coach who left would keep emailing their clients for thirty
-- days about sessions that are about to be erased. Recreated verbatim from
-- 20260918000001 apart from the added predicate.
--
-- Suspension is deliberately NOT filtered here: that is existing behaviour,
-- and a suspended coach may still be reinstated tomorrow with their bookings
-- intact. Worth revisiting, but not silently, in this migration.
-- -----------------------------------------------------------------------------
create or replace function public.claim_due_reminders(p_limit integer default 50)
returns setof public.bookings
language sql
security definer
set search_path = ''
as $$
  update public.bookings b
     set reminder_sent_at = now()
   where b.id in (
     select b2.id
       from public.bookings b2
       join public.profiles p on p.id = b2.profile_id
      where b2.action_type = 'calendar_booking'
        and b2.status = 'confirmed'
        and b2.reminder_sent_at is null
        and p.deleted_at is null
        and b2.starts_at > now() + interval '15 minutes'
        and b2.starts_at <= now() + make_interval(hours => p.reminder_hours_before)
        and b2.created_at <= now() - interval '1 hour'
      order by b2.starts_at
      limit p_limit
      for update of b2 skip locked
   )
  returning b.*;
$$;

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
