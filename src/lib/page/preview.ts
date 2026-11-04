import "server-only";

import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import type { Profile } from "@/lib/auth";
import { parseOfferFields } from "@/lib/offers/fields";
import { localized } from "@/lib/offers/schema";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { parseBlocks, type PageBlock } from "./blocks";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type PagePreview = {
  profile: PublicProfile;
  blocks: PageBlock[];
  offers: PublicOffer[];
  theme: string;
  accent: string;
};

/**
 * The coach's own page, as visitors see it — what the sign-up's appearance
 * screen and final screen show in their phone frame. Read through the coach's
 * session, so it filters exactly as the public page does: visible, complete
 * blocks only; nothing still to complete.
 */
export async function loadPagePreview(supabase: Client, profile: Profile): Promise<PagePreview> {
  const [{ data: blocks }, { data: offers }, { data: category }] = await Promise.all([
    supabase
      .from("page_blocks")
      .select("id, type, config, visible, offer_id")
      .eq("profile_id", profile.id)
      .eq("visible", true)
      .eq("pending", false)
      .order("position"),
    supabase
      .from("offers")
      .select(
        "id, title, description, price, price_type, main_photo_url, photos, action_type, action_config, custom_fields",
      )
      .eq("profile_id", profile.id)
      .eq("is_active", true),
    profile.category_id
      ? supabase
          .from("activity_categories")
          .select("name")
          .eq("id", profile.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const locale = profile.locale === "fr" ? "fr" : "en";

  return {
    profile: {
      id: profile.id,
      slug: profile.slug,
      display_name: profile.display_name,
      headline: profile.headline,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      location: profile.location,
      categoryName: category ? localized(category.name, locale, "") || null : null,
      whatsapp_number: profile.whatsapp_number,
      currency: profile.currency,
      timezone: profile.timezone,
      details: parseOfferFields(profile.custom_fields),
      locale,
      published: Boolean(profile.onboarding_completed_at),
    },
    blocks: parseBlocks(blocks ?? []),
    offers: (offers ?? []).map((offer) => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      price: offer.price,
      price_type: offer.price_type as PublicOffer["price_type"],
      main_photo_url: offer.main_photo_url,
      photos: (offer.photos as string[] | null) ?? [],
      action_type: offer.action_type,
      action_config: offer.action_config,
      custom_fields: parseOfferFields(offer.custom_fields),
    })),
    theme: profile.theme,
    accent: profile.accent_color,
  };
}
