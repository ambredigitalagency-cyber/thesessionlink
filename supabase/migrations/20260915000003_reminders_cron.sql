-- =============================================================================
-- Reminder dispatching.
--
-- pg_cron pings the app every 10 minutes; the app decides which reminders are
-- due (claim_due_reminders) and sends them through Resend. The URL and the
-- shared secret live in Supabase Vault, so this migration is safe to run on a
-- project that is not configured yet: dispatch_reminders() simply no-ops.
--
-- Configure once per environment:
--   select vault.create_secret('https://your-app.vercel.app', 'app_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- =============================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.dispatch_reminders()
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
    url := rtrim(v_app_url, '/') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.dispatch_reminders() from public, anon, authenticated;

select cron.schedule('thesessionlink-reminders', '*/10 * * * *', 'select public.dispatch_reminders()');
