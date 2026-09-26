-- =============================================================================
-- Console: internal notes on a coach, and read access to their gateways.
--
-- Notes are what one admin tells the next about an account — "called on the
-- 12th, card issue, will retry" — so the context survives whoever handled it.
-- The coach never sees them: every policy below is admin-only, and nothing on
-- the coach side selects this table.
--
-- Notes are written and read through the admin's own session, like the rest
-- of the console. An admin removes only the notes they wrote; nobody edits one
-- after the fact, so a note means what it meant when it was left.
-- =============================================================================

create table public.admin_notes (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body           text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at     timestamptz not null default now()
);

create index admin_notes_profile_idx on public.admin_notes (profile_id, created_at desc);

alter table public.admin_notes enable row level security;

create policy "Admins read notes"
  on public.admin_notes for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Admins write notes as themselves"
  on public.admin_notes for insert
  to authenticated
  with check (
    (select public.is_platform_admin()) and author_user_id = (select auth.uid())
  );

create policy "Admins remove their own notes"
  on public.admin_notes for delete
  to authenticated
  using (
    (select public.is_platform_admin()) and author_user_id = (select auth.uid())
  );

revoke all on public.admin_notes from anon, authenticated;
grant select, insert, delete on public.admin_notes to authenticated;

-- -----------------------------------------------------------------------------
-- The billing panel shows which gateways a coach has connected and whether
-- they can take charges. Payments were already readable by admins; the
-- accounts were not. Read-only, like every other admin policy on coach data:
-- connecting and disconnecting stay with the OAuth callbacks and webhooks.
-- -----------------------------------------------------------------------------
create policy "Platform admins read every payment account"
  on public.payment_accounts for select
  to authenticated
  using ((select public.is_platform_admin()));
