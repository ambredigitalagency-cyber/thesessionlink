-- =============================================================================
-- The console's revenue, from Paddle rather than from a switch.
--
-- subscription_active is true for a paying subscription, for a Paddle trial and
-- for an account the team switched on by hand; multiplied by the price, it is
-- a theoretical revenue and the console labels it so. The MRR the console now
-- also shows counts only subscriptions Paddle reports as `active`, which needs
-- subscription_status in the overview. Appended at the end so the view stays
-- replaceable; nothing else changes.
-- =============================================================================

create or replace view public.admin_coach_overview
with (security_invoker = true) as
  select
    p.id,
    p.user_id,
    p.display_name,
    p.slug,
    -- Set from the account's email at signup; the console searches on it.
    p.contact_email,
    p.locale,
    p.created_at,
    p.onboarding_completed_at,
    p.trial_ends_at,
    p.subscription_active,
    p.suspended_at,
    p.suspension_reason,
    p.category_id,
    c.name as category_name,
    (select count(*) from public.offers o where o.profile_id = p.id)::integer as offers_count,
    (select count(*) from public.bookings b where b.profile_id = p.id)::integer as bookings_count,
    (select max(b.created_at) from public.bookings b where b.profile_id = p.id) as last_booking_at,
    p.deleted_at,
    p.subscription_status
  from public.profiles p
  left join public.activity_categories c on c.id = p.category_id;

revoke all on public.admin_coach_overview from anon, authenticated;
grant select on public.admin_coach_overview to authenticated, service_role;
