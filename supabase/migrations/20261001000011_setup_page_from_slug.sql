-- -----------------------------------------------------------------------------
-- A reserved link answers from the moment it is reserved.
--
-- Onboarding is now: activity, name, link (the profile row is written here),
-- then the first offer, then the finishing touches. The first offer still
-- stamps onboarding_completed_at (offers_complete_onboarding), so until it is
-- published that column is null — and public_profiles hid such a profile
-- entirely: a coach who stopped after picking their link handed out a 404.
--
-- The page now exists from the link on and, with no offer yet, shows its
-- "being set up" state (not indexed: robots follow the offer count). Nothing
-- else opens up:
--   * offers and bookings keep their own gates — is_public_profile() and the
--     booking context still require onboarding_completed_at, and no offer can
--     exist before it is set anyway;
--   * the columns exposed are the same as before, contact details still
--     behind contact_channels.
--
-- Same definition as 20260926000001 without the onboarding condition.
-- -----------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, social_links,
    location, calendar_visible, custom_closed_message, theme, locale, timezone, currency,
    case when coalesce((contact_channels ->> 'whatsapp')::boolean, false)
      then whatsapp_number else null end as whatsapp_number,
    case when coalesce((contact_channels ->> 'email')::boolean, false)
      then contact_email else null end as contact_email,
    case when coalesce((contact_channels ->> 'phone')::boolean, false)
      then phone_number else null end as phone_number,
    custom_fields
  from public.profiles p
  where suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- The neutral "unavailable" page follows the same rule: a link suspended or
-- deleted before its first offer is unavailable, not unknown.
create or replace function public.profile_unavailable(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.slug = lower(p_slug)
       and (p.suspended_at is not null or p.deleted_at is not null)
  );
$$;

revoke execute on function public.profile_unavailable(text) from public;
grant execute on function public.profile_unavailable(text) to anon, authenticated, service_role;
