-- =============================================================================
-- The end of the trial, for real.
--
-- Fourteen days without an active subscription and the dashboard locks; the
-- public page stays online seven more days, then goes offline. A subscription
-- that comes back (or an admin switching the account on) restores everything
-- at once.
--
--   trial       the platform's trial is running
--   subscribed  an active subscription (past_due included) or switched on by
--               an admin
--   grace       no active subscription, trial or paid period over for less
--               than 7 days: dashboard locked, page online
--   expired     more than 7 days: dashboard locked, page offline
--
-- One rule, written once: access_state_at() below. The app mirrors it in
-- src/lib/billing/access.ts and a shared test matrix runs both. Suspension and
-- pending deletion keep their own, earlier checks and win over all of this.
--
--   1. profiles.subscription_ended_at — when the last subscription stopped
--      (written by the Paddle webhook and the admin switch); with
--      trial_ends_at it dates the start of the grace period.
--   2. access_state_at() / access_state() / access_ends_at().
--   3. Public reads: an expired page is offline everywhere — the public view,
--      its blocks, its offers, the tracker — and answers "unavailable".
--   4. Writes: a locked account can no longer change its page, by any road
--      (RLS on blocks, offers, sources, uploads; a trigger on profiles that
--      still lets it delete the account or change its language).
--   5. The four emails, claimed once per access period (access_emails).
--   6. trial_summary(): what the page brought during the trial.
--   7. The console's overview gains subscription_ended_at.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. When the last subscription stopped
-- -----------------------------------------------------------------------------

alter table public.profiles add column subscription_ended_at timestamptz;

comment on column public.profiles.subscription_ended_at is
  'When the last subscription stopped being active (Paddle canceled/paused, or switched off by an admin). Null while active or never subscribed.';

update public.profiles
   set subscription_ended_at = coalesce(subscription_synced_at, updated_at)
 where not subscription_active
   and subscription_status in ('canceled', 'paused');

-- The billing guard (20260929000001) keeps billing columns read-only to a
-- coach's own session; this one belongs with them.
create or replace function public.profiles_guard_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) is distinct from 'authenticated' then
    return new;
  end if;
  if public.is_platform_admin() then
    return new;
  end if;

  if new.subscription_active     is distinct from old.subscription_active
  or new.subscription_status     is distinct from old.subscription_status
  or new.subscription_renews_at  is distinct from old.subscription_renews_at
  or new.subscription_synced_at  is distinct from old.subscription_synced_at
  or new.subscription_ended_at   is distinct from old.subscription_ended_at
  or new.paddle_customer_id      is distinct from old.paddle_customer_id
  or new.paddle_subscription_id  is distinct from old.paddle_subscription_id
  or new.trial_ends_at           is distinct from old.trial_ends_at
  or new.suspended_at            is distinct from old.suspended_at
  or new.suspension_reason       is distinct from old.suspension_reason
  or new.suspended_by            is distinct from old.suspended_by then
    raise exception 'billing_fields_are_read_only' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. The rule
-- -----------------------------------------------------------------------------

/** When access ended or ends: the later of the trial's end and the last subscription's. */
create or replace function public.access_ends_at(
  p_trial_ends_at         timestamptz,
  p_subscription_ended_at timestamptz
)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select greatest(p_trial_ends_at, coalesce(p_subscription_ended_at, p_trial_ends_at));
$$;

/** The state at a given instant. Pure: the clock is an argument. */
create or replace function public.access_state_at(
  p_trial_ends_at         timestamptz,
  p_subscription_active   boolean,
  p_subscription_ended_at timestamptz,
  p_now                   timestamptz
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_subscription_active, false) then 'subscribed'
    when p_trial_ends_at is not null and p_now < p_trial_ends_at then 'trial'
    when p_now < public.access_ends_at(p_trial_ends_at, p_subscription_ended_at) + interval '7 days'
      then 'grace'
    else 'expired'
  end;
$$;

create or replace function public.access_state(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.access_state_at(p.trial_ends_at, p.subscription_active, p.subscription_ended_at, now())
    from public.profiles p
   where p.id = p_profile_id;
$$;

revoke execute on function public.access_state(uuid) from public, anon;
grant execute on function public.access_state(uuid) to authenticated, service_role;

/**
 * May the signed-in coach change their page? Not when locked (grace,
 * expired), suspended or on the way out. Admins write through their own
 * policies and are not concerned.
 */
create or replace function public.can_edit_own_page()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.user_id = (select auth.uid())
       and p.suspended_at is null
       and p.deleted_at is null
       and public.access_state_at(p.trial_ends_at, p.subscription_active, p.subscription_ended_at, now())
           in ('trial', 'subscribed')
  );
$$;

revoke execute on function public.can_edit_own_page() from public, anon;
grant execute on function public.can_edit_own_page() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. An expired page is offline
-- -----------------------------------------------------------------------------

create or replace function public.is_live_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_profile_id
       and p.onboarding_completed_at is not null
       and p.suspended_at is null
       and p.deleted_at is null
       and public.access_state_at(p.trial_ends_at, p.subscription_active, p.subscription_ended_at, now())
           <> 'expired'
  );
$$;

-- Offers follow the page: public only while it is live.
create or replace function public.is_public_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_live_profile(p_profile_id);
$$;

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
       and (
         p.suspended_at is not null
         or p.deleted_at is not null
         or public.access_state_at(p.trial_ends_at, p.subscription_active, p.subscription_ended_at, now())
            = 'expired'
       )
  );
$$;

-- Same columns as 20261103000001; expired pages are no longer in it at all.
create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, location,
    theme, accent_color, locale, timezone, currency,
    case when public.exposes_whatsapp(p.id) then whatsapp_number end as whatsapp_number,
    custom_fields,
    onboarding_completed_at is not null as published
  from public.profiles p
  where suspended_at is null
    and deleted_at is null
    and public.access_state_at(p.trial_ends_at, p.subscription_active, p.subscription_ended_at, now())
        <> 'expired';

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. A locked account cannot change its page, by any road
-- -----------------------------------------------------------------------------

drop policy "Owners create blocks" on public.page_blocks;
drop policy "Owners update blocks" on public.page_blocks;
drop policy "Owners delete blocks" on public.page_blocks;
create policy "Owners create blocks" on public.page_blocks for insert to authenticated
  with check (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));
create policy "Owners update blocks" on public.page_blocks for update to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()))
  with check (profile_id = (select public.current_profile_id()));
create policy "Owners delete blocks" on public.page_blocks for delete to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));

drop policy "Owners create offers" on public.offers;
drop policy "Owners update offers" on public.offers;
drop policy "Owners delete offers" on public.offers;
create policy "Owners create offers" on public.offers for insert to authenticated
  with check (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));
create policy "Owners update offers" on public.offers for update to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()))
  with check (profile_id = (select public.current_profile_id()));
create policy "Owners delete offers" on public.offers for delete to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));

drop policy "Owners manage their sources" on public.tracking_sources;
create policy "Owners read their sources" on public.tracking_sources for select to authenticated
  using (profile_id = (select public.current_profile_id()));
create policy "Owners create sources" on public.tracking_sources for insert to authenticated
  with check (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));
create policy "Owners update sources" on public.tracking_sources for update to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()))
  with check (profile_id = (select public.current_profile_id()));
create policy "Owners delete sources" on public.tracking_sources for delete to authenticated
  using (profile_id = (select public.current_profile_id()) and (select public.can_edit_own_page()));

drop policy "Users upload to their own media folder" on storage.objects;
drop policy "Users update their own media" on storage.objects;
create policy "Users upload to their own media folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.can_edit_own_page())
  );
create policy "Users update their own media" on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.can_edit_own_page())
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

/**
 * The profile row itself: a locked coach keeps two doors — leaving (the
 * deletion columns) and the interface language. Everything else that makes the
 * page (name, bio, theme, contact…) waits for a subscription.
 */
create or replace function public.profiles_guard_locked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if (select auth.role()) is distinct from 'authenticated' or public.is_platform_admin() then
    return new;
  end if;
  if public.access_state_at(old.trial_ends_at, old.subscription_active, old.subscription_ended_at, now())
     in ('trial', 'subscribed') then
    return new;
  end if;

  v_old := to_jsonb(old) - array['deleted_at', 'deletion_warned_at', 'locale', 'updated_at'];
  v_new := to_jsonb(new) - array['deleted_at', 'deletion_warned_at', 'locale', 'updated_at'];
  if v_old is distinct from v_new then
    raise exception 'subscription_required' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_locked
  before update on public.profiles
  for each row execute function public.profiles_guard_locked();

-- -----------------------------------------------------------------------------
-- 5. The four emails, once each per access period
-- -----------------------------------------------------------------------------

create table public.access_emails (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('trial_ending', 'grace_started', 'offline_soon', 'offline')),
  -- The access end this email is about: a later subscription that ends again
  -- opens a new period, and its own emails.
  period_end timestamptz not null,
  status     text not null default 'claimed' check (status in ('claimed', 'sent', 'skipped')),
  created_at timestamptz not null default now(),
  primary key (profile_id, kind, period_end)
);

comment on table public.access_emails is
  'Trial-end emails, one row per profile, kind and access period: the row is the proof it was claimed, so no email goes twice.';

alter table public.access_emails enable row level security;
revoke all on public.access_emails from anon, authenticated;
grant select, insert, update, delete on public.access_emails to service_role;

/**
 * Which email each account is due, at p_now:
 *   trial_ending   the trial ends within 3 days, no subscription
 *   grace_started  the trial or subscription is over, page still online
 *   offline_soon   2 days or less before the page goes offline
 *   offline        the page went offline (within the last 3 days only, so an
 *                  old backlog is never mailed at once)
 * Only the most advanced one is sent; the ones it overtakes are recorded as
 * skipped, so they are never sent afterwards, out of order.
 */
create or replace function public.access_email_due(
  p_trial_ends_at         timestamptz,
  p_subscription_active   boolean,
  p_subscription_ended_at timestamptz,
  p_now                   timestamptz
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_subscription_active, false) then null
    when p_now >= public.access_ends_at(p_trial_ends_at, p_subscription_ended_at) + interval '7 days'
      then case
        when p_now < public.access_ends_at(p_trial_ends_at, p_subscription_ended_at) + interval '10 days'
          then 'offline'
      end
    when p_now >= public.access_ends_at(p_trial_ends_at, p_subscription_ended_at) + interval '5 days'
      then 'offline_soon'
    when p_now >= public.access_ends_at(p_trial_ends_at, p_subscription_ended_at)
      then 'grace_started'
    when p_now >= p_trial_ends_at - interval '3 days' then 'trial_ending'
  end;
$$;

create or replace function public.claim_access_emails(p_now timestamptz default now(), p_limit integer default 50)
returns table (
  profile_id    uuid,
  kind          text,
  period_end    timestamptz,
  user_id       uuid,
  contact_email text,
  locale        text,
  display_name  text,
  slug          text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order text[] := array['trial_ending', 'grace_started', 'offline_soon', 'offline'];
  v_row   record;
  v_kind  text;
  v_end   timestamptz;
  v_count integer := 0;
begin
  for v_row in
    select p.*
      from public.profiles p
     where p.onboarding_completed_at is not null
       and p.suspended_at is null
       and p.deleted_at is null
       and not coalesce(p.subscription_active, false)
     order by p.trial_ends_at
     for update of p skip locked
  loop
    exit when v_count >= p_limit;
    v_kind := public.access_email_due(v_row.trial_ends_at, v_row.subscription_active,
                                      v_row.subscription_ended_at, p_now);
    continue when v_kind is null;
    v_end := public.access_ends_at(v_row.trial_ends_at, v_row.subscription_ended_at);

    insert into public.access_emails as e (profile_id, kind, period_end)
    values (v_row.id, v_kind, v_end)
    on conflict on constraint access_emails_pkey do nothing;
    continue when not found;

    -- The earlier emails of this period are overtaken: never send them now.
    insert into public.access_emails (profile_id, kind, period_end, status)
    select v_row.id, k, v_end, 'skipped'
      from unnest(v_order[1:array_position(v_order, v_kind) - 1]) as k
    on conflict on constraint access_emails_pkey do nothing;

    v_count := v_count + 1;
    profile_id    := v_row.id;
    kind          := v_kind;
    period_end    := v_end;
    user_id       := v_row.user_id;
    contact_email := v_row.contact_email;
    locale        := v_row.locale;
    display_name  := v_row.display_name;
    slug          := v_row.slug;
    return next;
  end loop;
end;
$$;

revoke execute on function public.claim_access_emails(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_access_emails(timestamptz, integer) to service_role;

create or replace function public.dispatch_access_emails()
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
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_app_url, '/') || '/api/cron/access-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.dispatch_access_emails() from public, anon, authenticated;

-- Mid-morning UTC: read in the day, in Morocco and in Europe alike.
select cron.schedule('thesessionlink-access-emails', '0 9 * * *', 'select public.dispatch_access_emails()');

-- -----------------------------------------------------------------------------
-- 6. What the page brought during the trial
-- -----------------------------------------------------------------------------

create or replace function public.trial_summary(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_result  jsonb;
begin
  if not (
    coalesce(p_profile_id = public.current_profile_id(), false)
    or coalesce(public.is_platform_admin(), false)
    or coalesce((select auth.role()) = 'service_role', false)
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then
    return null;
  end if;

  select jsonb_build_object(
           'views',    count(*) filter (where e.type = 'view'),
           'clicks',   count(*) filter (where e.type <> 'view'),
           'contacts', count(*) filter (where e.type = 'contact')
         )
    into v_result
    from public.page_events e
   where e.profile_id = p_profile_id
     and e.created_at >= v_profile.created_at
     and e.created_at < v_profile.trial_ends_at;

  return v_result;
end;
$$;

revoke execute on function public.trial_summary(uuid) from public, anon;
grant execute on function public.trial_summary(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. The console
-- -----------------------------------------------------------------------------

create or replace view public.admin_coach_overview
with (security_invoker = true) as
  select p.id,
         p.user_id,
         p.display_name,
         p.slug,
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
         p.deleted_at,
         p.subscription_status,
         p.subscription_ended_at
    from public.profiles p
    left join public.activity_categories c on c.id = p.category_id;
