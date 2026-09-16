-- =============================================================================
-- Subscription plans.
--
-- A profile is created on `base` with a 14-day trial, so a new pro gets the
-- full product straight away. When the trial runs out, expire_trials() drops
-- the profile to `free` unless it has an active subscription.
--
-- PAYMENTS ARE NOT WIRED YET. `subscription_active` is set by hand for now
-- (SQL / Studio) and is otherwise always false. When billing lands, its webhook
-- only has to set this column to true: expire_trials() and effective_plan()
-- already treat it as the single "this pro is paying" signal, so no other code
-- has to change.
-- =============================================================================

create type public.plan_type as enum ('free', 'base', 'premium');

alter table public.profiles
  add column plan_type           public.plan_type not null default 'base',
  add column trial_ends_at       timestamptz      not null default (now() + interval '14 days'),
  add column subscription_active boolean          not null default false;

-- Existing profiles keep a trial measured from their own signup, not from the
-- moment this migration ran.
update public.profiles set trial_ends_at = created_at + interval '14 days';

comment on column public.profiles.plan_type is
  'Stored plan. Read it through effective_plan() rather than directly: a lapsed '
  'trial still reads as base/premium here until expire_trials() next runs.';

comment on column public.profiles.subscription_active is
  'Manual for now — no payment provider is connected. The future billing '
  'webhook only needs to set this to true to stop the drop to free.';

-- -----------------------------------------------------------------------------
-- Effective plan
--
-- The plan that actually applies right now. expire_trials() only runs once a
-- day, so between a trial lapsing and the next run the stored plan_type is
-- stale; every read path goes through this function instead.
--
-- Mirrored in TypeScript by effectivePlan() in src/lib/plans/config.ts — keep
-- the two in step.
-- -----------------------------------------------------------------------------
create or replace function public.effective_plan(p public.profiles)
returns public.plan_type
language sql
stable
set search_path = ''
as $$
  select case
    when p.subscription_active then p.plan_type
    when p.trial_ends_at > now() then p.plan_type
    else 'free'::public.plan_type
  end;
$$;

grant execute on function public.effective_plan(public.profiles) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Trial expiry
--
-- Idempotent: profiles already on free, or with a subscription, are skipped.
-- -----------------------------------------------------------------------------
create or replace function public.expire_trials()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.profiles
     set plan_type = 'free',
         updated_at = now()
   where plan_type <> 'free'
     and subscription_active = false
     and trial_ends_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.expire_trials() from public, anon, authenticated;
grant execute on function public.expire_trials() to service_role;

select cron.schedule('thesessionlink-expire-trials', '15 3 * * *', 'select public.expire_trials()');

-- -----------------------------------------------------------------------------
-- Automatic reminders are a paid feature: stop claiming them for free profiles.
-- Same body as the original, with the plan predicate added.
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
        and b2.starts_at > now() + interval '15 minutes'
        and b2.starts_at <= now() + make_interval(hours => p.reminder_hours_before)
        and b2.created_at <= now() - interval '1 hour'
        and public.effective_plan(p) <> 'free'
      order by b2.starts_at
      limit p_limit
      for update of b2 skip locked
   )
  returning b.*;
$$;

revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
