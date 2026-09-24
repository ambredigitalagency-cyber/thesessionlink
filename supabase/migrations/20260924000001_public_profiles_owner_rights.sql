-- =============================================================================
-- Fix: the public profile page stopped resolving.
--
-- 20260923000003 recreated public_profiles to exclude suspended coaches, and
-- added `security_invoker = true` along the way. The original view, created in
-- the core schema, had no such option on purpose: it runs with its owner's
-- rights, which is what lets an anonymous visitor read a profile through the
-- view without anon ever holding SELECT on public.profiles.
--
-- With security_invoker the check moved to the caller, anon was refused, and
-- every /[slug] page answered 404.
--
-- Back to owner's rights. The view stays the only door to a profile from the
-- outside: it exposes a fixed column list, hides the contact details the pro
-- did not publish, and now also filters out suspended accounts.
-- =============================================================================

alter view public.public_profiles set (security_invoker = false);

-- Unchanged, restated so the grants are visible next to the switch.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
