-- =============================================================================
-- Console enrichment: sign-in history, direct interventions, data export.
--
-- 1. coach_sign_ins — every successful sign-in, recorded by the app itself in
--    the auth routes (/auth/callback, /auth/confirm). Hosted Supabase does not
--    keep its auth audit trail in the database, so the console could not show
--    a history without one. Deliberately thin: when, how (magic link or
--    Google), a readable device ("Chrome · Windows") and the IP truncated to
--    its network (/24 for IPv4, /48 for IPv6) — enough to spot "a new country"
--    or "a new machine", not enough to locate anyone. Written with the service
--    role only; read by platform admins only; gone with the account.
--
-- 2. admin_active_sessions() — when the coach's live Supabase sessions were
--    opened and last refreshed, for the same panel. Times only: the user agent
--    and IP Supabase stores there are this app's server (the link is
--    confirmed server-side), not the coach's device — the real device is in
--    coach_sign_ins. auth.sessions is not exposed to the API, hence a function.
--
-- 3. Direct interventions. Admins could read offers and bookings, not change
--    them. They now can, through UPDATE policies — every such write goes
--    through a server action that records it in admin_audit_log.
--
-- 4. Export. Admins can now read clients, for the coach data export. The
--    export itself leaves health notes out (server side, by column list).
-- =============================================================================

create table public.coach_sign_ins (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  method      text not null check (method in ('magic_link', 'google', 'other')),
  device      text check (char_length(device) <= 120),
  ip_prefix   text check (char_length(ip_prefix) <= 64)
);

create index coach_sign_ins_user_idx on public.coach_sign_ins (user_id, created_at desc);

alter table public.coach_sign_ins enable row level security;

create policy "Admins read sign-ins"
  on public.coach_sign_ins for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.coach_sign_ins from anon, authenticated;
grant select on public.coach_sign_ins to authenticated;

-- -----------------------------------------------------------------------------

create or replace function public.admin_active_sessions(p_user_id uuid)
returns table (
  created_at   timestamptz,
  refreshed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- A member admin through their session, or the console password through
  -- the service role. Nobody else.
  if not (public.is_platform_admin() or (select auth.role()) = 'service_role') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select s.created_at,
           coalesce(s.refreshed_at, s.updated_at, s.created_at)
      from auth.sessions s
     where s.user_id = p_user_id
       and (s.not_after is null or s.not_after > now())
     order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
     limit 20;
end;
$$;

revoke execute on function public.admin_active_sessions(uuid) from public, anon;
grant execute on function public.admin_active_sessions(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------

create policy "Platform admins update every offer"
  on public.offers for update
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins update every booking"
  on public.bookings for update
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins read every client"
  on public.clients for select
  to authenticated
  using ((select public.is_platform_admin()));

-- -----------------------------------------------------------------------------

alter table public.admin_audit_log drop constraint admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (action in (
    'extend_trial', 'set_subscription', 'suspend', 'unsuspend',
    'impersonate_start', 'impersonate_stop', 'restore_account',
    'edit_offer', 'edit_booking', 'export_data'
  ));
