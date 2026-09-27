-- =============================================================================
-- service_role privileges on every table and view created since 20260917.
--
-- 20260917000001_explicit_grants granted table privileges once, to the tables
-- that existed that day. On the hosted project, tables created afterwards did
-- not inherit them for service_role (local development did, through the
-- default privileges of the local image) — so in production the service role
-- could not read or write:
--
--   admin_audit_log, admin_notes, platform_admins, admin_coach_overview,
--   client_summaries, coach_sign_ins, paddle_webhook_events,
--   payment_accounts, payments, public_payment_options
--
-- Seen as: the console's password door listing "0 coaches", sign-ins not
-- recorded (42501), Paddle events not marked as processed, and the Stripe /
-- PayPal webhooks unable to touch payments.
--
-- service_role bypasses RLS by design; it still needs the table privilege.
-- It is only ever used server-side (webhooks, crons, the console's password
-- door), never sent to a browser.
--
-- The default privileges below make future tables and views created by the
-- migration role carry the same grant, so this does not happen again.
-- =============================================================================

grant select, insert, update, delete on
  public.admin_audit_log,
  public.admin_notes,
  public.platform_admins,
  public.coach_sign_ins,
  public.paddle_webhook_events,
  public.payment_accounts,
  public.payments
to service_role;

grant select on
  public.admin_coach_overview,
  public.client_summaries,
  public.public_payment_options
to service_role;

grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
