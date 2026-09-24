-- =============================================================================
-- What the platform console lists.
--
-- security_invoker, like the other views: an admin sees every row through the
-- "Platform admins read every ..." policies, and a coach who somehow queried it
-- would see their own row and nothing else. No service-role client involved.
--
-- The counters are subqueries rather than joins so a coach with no offers and
-- no bookings still appears, once.
-- =============================================================================

create view public.admin_coach_overview
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
    (select max(b.created_at) from public.bookings b where b.profile_id = p.id) as last_booking_at
  from public.profiles p
  left join public.activity_categories c on c.id = p.category_id;

revoke all on public.admin_coach_overview from anon, authenticated;
grant select on public.admin_coach_overview to authenticated;
