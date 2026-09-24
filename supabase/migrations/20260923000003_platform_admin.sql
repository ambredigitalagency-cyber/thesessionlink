-- =============================================================================
-- Platform administration.
--
-- A separate space for the platform owner, with its own membership table rather
-- than a flag on profiles: being an admin is a property of the *account*, not of
-- a coach profile, and an admin may have no coach profile at all.
--
-- HOW TO BECOME ADMIN — on purpose, there is no screen for this. Run it by hand
-- in the SQL editor (Studio) or psql:
--
--   insert into public.platform_admins (user_id, note)
--   select id, 'founder' from auth.users where email = 'you@example.com';
--
-- Nothing in the app can insert into this table: authenticated has SELECT only,
-- so a compromised session cannot promote itself.
--
-- Access is granted through named policies on each table the console reads,
-- never by handing the console a service-role client: every read an admin makes
-- is expressible — and reviewable — as a policy.
-- =============================================================================

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

/**
 * True when the caller is a platform admin.
 *
 * security definer so the lookup itself is not subject to the policies below —
 * the table is owned by the migration role, for which RLS is not enforced, so
 * there is no recursion between this function and its own table's policy.
 */
create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;

create policy "Admins read the roster"
  on public.platform_admins for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;

-- -----------------------------------------------------------------------------
-- Audit log. Append-only: there is no update or delete policy, on purpose — an
-- admin can read their history and add to it, never rewrite it.
-- -----------------------------------------------------------------------------
create table public.admin_audit_log (
  id                uuid primary key default gen_random_uuid(),
  admin_user_id     uuid not null references auth.users (id) on delete cascade,
  action            text not null check (action in (
                      'extend_trial', 'set_subscription', 'suspend', 'unsuspend',
                      'impersonate_start', 'impersonate_stop'
                    )),
  target_profile_id uuid references public.profiles (id) on delete set null,
  /** What changed, and why: reason, previous and new values. Never secrets. */
  details           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index admin_audit_log_target_idx on public.admin_audit_log (target_profile_id, created_at desc);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "Admins read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Admins append to the audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (
    (select public.is_platform_admin()) and admin_user_id = (select auth.uid())
  );

revoke all on public.admin_audit_log from anon, authenticated;
grant select, insert on public.admin_audit_log to authenticated;

-- -----------------------------------------------------------------------------
-- Suspension. A suspended coach keeps their data: the dashboard sends them to
-- an explanation, and the public page stops resolving.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column suspended_at     timestamptz,
  add column suspension_reason text,
  add column suspended_by      uuid references auth.users (id) on delete set null;

comment on column public.profiles.suspended_at is
  'Set by a platform admin. While set, the dashboard is blocked and the public '
  'profile no longer resolves. The reason is shown to the coach.';

-- The public view is the single door to a profile from the outside.
create or replace view public.public_profiles
with (security_invoker = true) as
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
    and suspended_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- -----------------------------------------------------------------------------
-- What an admin may see. One policy per table, named for what it is.
--
-- clients is deliberately absent: those rows carry health notes belonging to
-- the coach's clients, and the console has no feature that needs them.
-- -----------------------------------------------------------------------------
create policy "Platform admins read every profile"
  on public.profiles for select
  to authenticated
  using ((select public.is_platform_admin()));

/**
 * Subscription and suspension are the only columns the console writes. Postgres
 * policies cannot narrow an update to a column list, so the restriction lives in
 * the server actions — and every write they make lands in admin_audit_log.
 */
create policy "Platform admins update subscription and suspension"
  on public.profiles for update
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins read every offer"
  on public.offers for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins read every booking"
  on public.bookings for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins read every availability"
  on public.availabilities for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins read every time off"
  on public.time_off for select
  to authenticated
  using ((select public.is_platform_admin()));
