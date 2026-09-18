-- =============================================================================
-- Single plan.
--
-- Free / Base / Premium are replaced by one plan at 9 €/month that includes
-- everything (unlimited offers and photos, CRM, automatic reminders). With a
-- single plan there is nothing left to store or compare, so plan_type, the
-- effective_plan() helper, the daily expire_trials() job and the plan predicate
-- on reminders all go.
--
-- trial_ends_at and subscription_active stay: they remain the trial /
-- subscription signal for billing.
--
-- PAYMENTS ARE NOT WIRED YET. Nothing is gated on these two columns today: a
-- profile keeps full access after its trial ends. The trial now requires a
-- bank card, but that must be enforced in the signup flow once Stripe/PayPal is
-- integrated (collect a payment method before the profile is created, then let
-- the billing webhook set subscription_active). Until then, signup stays open
-- and trial_ends_at keeps its +14 days default.
-- =============================================================================

select cron.unschedule('thesessionlink-expire-trials');

drop function public.expire_trials();

-- Reminders go to every profile again. Same body as before, minus the
-- effective_plan() predicate — this has to land before that function is dropped.
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
      order by b2.starts_at
      limit p_limit
      for update of b2 skip locked
   )
  returning b.*;
$$;

revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

drop function public.effective_plan(public.profiles);

alter table public.profiles drop column plan_type;

drop type public.plan_type;

comment on column public.profiles.trial_ends_at is
  'End of the 14-day trial. Not enforced yet: access is not cut when it passes. '
  'Once Stripe/PayPal is integrated, the trial requires a bank card, collected in '
  'the signup flow before this profile is created.';

comment on column public.profiles.subscription_active is
  'Manual for now — no payment provider is connected. The future billing '
  'webhook sets this to true once the card collected at signup is charged.';
