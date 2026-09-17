-- =============================================================================
-- Make table privileges explicit instead of inherited.
--
-- The earlier migrations only ever REVOKE. That works locally because
-- `supabase db reset` runs them as `postgres`, and Supabase's default
-- privileges already grant everything on new public tables to anon,
-- authenticated and service_role — the revokes then carve that back.
--
-- `supabase db push` against a hosted project runs as a temporary
-- `cli_login_postgres` role. Those default privileges are attached to
-- `postgres`, so they never fired: the tables landed with no grants at all,
-- every revoke was a no-op, and even service_role got 42501 "permission
-- denied" on every table. The app could not read a single row.
--
-- This migration restates the baseline and replays the same restrictions, so
-- the end state no longer depends on which role ran the migrations. It is
-- idempotent and produces exactly the privileges a local `db reset` gives.
--
-- New tables added later need the same treatment: grant explicitly rather than
-- relying on default privileges.
-- =============================================================================

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- --- same restrictions as ..._core_schema.sql -------------------------------
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

revoke all on public.client_summaries from anon, authenticated;
grant select on public.client_summaries to authenticated;

revoke all on public.profiles, public.availabilities, public.time_off,
               public.clients, public.bookings from anon;
revoke insert, update, delete on public.offers, public.activity_categories from anon;
revoke insert, update, delete on public.activity_categories from authenticated;
revoke insert on public.bookings from authenticated;

-- --- same restriction as ..._rate_limits.sql --------------------------------
revoke all on public.rate_limit_events from anon, authenticated;
