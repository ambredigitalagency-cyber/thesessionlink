-- =============================================================================
-- Profile details: free-form information on the profile itself.
--
-- Same shape as offers.custom_fields and clients.custom_fields
-- ([{ id, type, definition, value }]), validated by src/lib/offers/fields.ts,
-- so the one editor and the one renderer serve all three. What a coach puts
-- here is about them rather than about an offer: years of practice, languages,
-- certifications, the area they cover.
--
-- The layout and card style of the public page need no column: they live in
-- profiles.theme next to the accent, validated by themeSchema.
-- =============================================================================

alter table public.profiles
  add column custom_fields jsonb not null default '[]'::jsonb;

alter table public.profiles
  add constraint profiles_custom_fields_check check (jsonb_typeof(custom_fields) = 'array');

comment on column public.profiles.custom_fields is
  'Public profile details, same shape as offers.custom_fields. '
  'Validated by src/lib/offers/fields.ts.';

-- -----------------------------------------------------------------------------
-- public_profiles exposes it. Same definition as 20260924000002, with the new
-- column appended last — `create or replace view` only allows adding columns
-- at the end.
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
  where onboarding_completed_at is not null
    and suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
