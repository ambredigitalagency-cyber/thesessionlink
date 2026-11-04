/**
 * What the console's coach page reads off the rows it loads: how complete the
 * public page is.
 *
 * Pure, so the figures are tested once here rather than eyeballed on screen.
 */

export const COMPLETENESS_ITEMS = [
  "photo",
  "headline",
  "bio",
  "location",
  "contact",
  "socials",
  "details",
  "offer",
] as const;
export type CompletenessItem = (typeof COMPLETENESS_ITEMS)[number];

export type CompletenessInput = {
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  social_links: unknown;
  custom_fields: unknown;
  activeOffers: number;
};

/** Which parts of the public page are filled, in the order they appear on it. */
export function profileCompleteness(profile: CompletenessInput): {
  done: CompletenessItem[];
  missing: CompletenessItem[];
  ratio: number;
} {
  const socials =
    profile.social_links && typeof profile.social_links === "object"
      ? Object.values(profile.social_links as Record<string, unknown>).some(Boolean)
      : false;

  const filled: Record<CompletenessItem, boolean> = {
    photo: Boolean(profile.avatar_url),
    headline: Boolean(profile.headline?.trim()),
    bio: Boolean(profile.bio?.trim()),
    location: Boolean(profile.location?.trim()),
    contact: Boolean(profile.phone_number || profile.whatsapp_number),
    socials,
    details: Array.isArray(profile.custom_fields) && profile.custom_fields.length > 0,
    offer: profile.activeOffers > 0,
  };

  const done = COMPLETENESS_ITEMS.filter((item) => filled[item]);
  return {
    done,
    missing: COMPLETENESS_ITEMS.filter((item) => !filled[item]),
    ratio: done.length / COMPLETENESS_ITEMS.length,
  };
}
