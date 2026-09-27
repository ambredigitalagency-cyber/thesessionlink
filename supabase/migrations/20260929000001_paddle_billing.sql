-- =============================================================================
-- Paddle Billing: the coach's own subscription to TheSessionLink.
--
-- Not to be confused with payment_accounts / payments (Stripe Connect and
-- PayPal), which carry the money a coach's CLIENTS pay the coach. This is the
-- other direction: the coach paying the platform, through Paddle as merchant
-- of record.
--
-- 1. Profile columns mirroring the Paddle subscription. subscription_active
--    stays the one flag the product reads; the rest explains it.
--
-- 2. paddle_webhook_events — one row per Paddle event applied, keyed by the
--    event id Paddle puts on every delivery, so a retried or replayed event
--    is recognised and not applied twice.
--
-- 3. A guard on billing columns. Until now the "Owners update their profile"
--    policy let a signed-in coach write ANY column of their own profile —
--    subscription_active included, straight through the REST API with their
--    own session. With real billing that is a free subscription for the
--    asking. The trigger below lets those columns be written only by the
--    service role (webhooks, server actions using it) or a platform admin.
-- =============================================================================

alter table public.profiles
  add column paddle_customer_id     text unique,
  add column paddle_subscription_id text unique,
  add column subscription_status    text
    check (subscription_status in ('trialing', 'active', 'past_due', 'paused', 'canceled')),
  add column subscription_renews_at timestamptz,
  add column subscription_synced_at timestamptz;

comment on column public.profiles.subscription_status is
  'Paddle subscription status, as last reported by a webhook. subscription_active '
  'is derived from it: trialing, active and past_due count as active.';
comment on column public.profiles.subscription_synced_at is
  'occurred_at of the last Paddle subscription event applied; an older event '
  'arriving late never overwrites a newer truth.';

-- -----------------------------------------------------------------------------

create table public.paddle_webhook_events (
  event_id    text primary key,
  event_type  text not null,
  occurred_at timestamptz not null,
  profile_id  uuid references public.profiles (id) on delete set null,
  outcome     text not null,
  received_at timestamptz not null default now()
);

create index paddle_webhook_events_profile_idx on public.paddle_webhook_events (profile_id, occurred_at desc);

alter table public.paddle_webhook_events enable row level security;

create policy "Admins read Paddle events"
  on public.paddle_webhook_events for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.paddle_webhook_events from anon, authenticated;
grant select on public.paddle_webhook_events to authenticated;

-- -----------------------------------------------------------------------------

create or replace function public.profiles_guard_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The service role and the migration owner are the billing system itself.
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

create trigger profiles_guard_billing
  before update on public.profiles
  for each row execute function public.profiles_guard_billing();
