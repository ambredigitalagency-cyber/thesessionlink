-- =============================================================================
-- Console password access (solo / demo use) — see src/lib/admin/password-access.ts.
--
-- The console can now be opened with a shared password instead of a
-- platform_admins account. That door has no Supabase identity, so what it does
-- cannot be attributed to a user. Rather than invent one, the journal and the
-- notes say which door an action came through:
--
--   via = 'member'   → admin_user_id / author_user_id is the admin, as before
--   via = 'password' → no user; the row is written with the service role
--
-- The check keeps the two in step, so a password row can never claim a user
-- and a member row can never lose theirs. Existing rows are all 'member'.
--
-- RLS is unchanged: the member policies still require the author to be the
-- caller. Password rows are written by the service role, which bypasses RLS,
-- and are read back by members through the existing "Admins read …" policies.
-- =============================================================================

alter table public.admin_audit_log
  alter column admin_user_id drop not null,
  add column via text not null default 'member' check (via in ('member', 'password'));

alter table public.admin_audit_log
  add constraint admin_audit_log_actor_check
  check ((via = 'member') = (admin_user_id is not null));

alter table public.admin_notes
  alter column author_user_id drop not null,
  add column via text not null default 'member' check (via in ('member', 'password'));

alter table public.admin_notes
  add constraint admin_notes_author_check
  check ((via = 'member') = (author_user_id is not null));

comment on column public.admin_audit_log.via is
  'Which door the action came through: a platform_admins member, or the console password.';
comment on column public.admin_notes.via is
  'Which door the note came through: a platform_admins member, or the console password.';
