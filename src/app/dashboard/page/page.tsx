import { getTranslations } from "next-intl/server";

import type { EditorBlock } from "@/actions/page";
import { PageEditor } from "@/components/page/editor/page-editor";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { parseOfferFields } from "@/lib/offers/fields";
import { localized } from "@/lib/offers/schema";
import { isBlockType } from "@/lib/page/blocks";
import { getTheme } from "@/lib/page/themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("page") };
}

/** Ma page: the blocks, the header and the look of the public page, with its live preview. */
export default async function MyPage() {
  const profile = await requireOnboardedProfile();
  const supabase = await createSupabaseServerClient();

  const [{ data: blocks }, { data: offers }, { data: categories }] = await Promise.all([
    supabase
      .from("page_blocks")
      .select("id, type, config, visible, offer_id, pending, suggested")
      .eq("profile_id", profile.id)
      .order("position"),
    supabase
      .from("offers")
      .select(
        "id, title, description, price, price_type, main_photo_url, photos, action_type, action_config, custom_fields, is_active",
      )
      .eq("profile_id", profile.id)
      .order("position"),
    supabase
      .from("activity_categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("position"),
  ]);

  const category = (categories ?? []).find((item) => item.id === profile.category_id);
  const viewProfile: PublicProfile = {
    id: profile.id,
    slug: profile.slug,
    display_name: profile.display_name,
    headline: profile.headline,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    location: profile.location,
    categoryName: category ? localized(category.name, profile.locale, "") || null : null,
    whatsapp_number: profile.whatsapp_number,
    currency: profile.currency,
    timezone: profile.timezone,
    details: parseOfferFields(profile.custom_fields),
    locale: profile.locale === "fr" ? "fr" : "en",
    published: Boolean(profile.onboarding_completed_at),
  };

  const viewOffers: (PublicOffer & { is_active: boolean })[] = (offers ?? []).map((offer) => ({
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
    is_active: offer.is_active,
  }));

  const editorBlocks = (blocks ?? []).flatMap((block) =>
    isBlockType(block.type)
      ? [
          {
            id: block.id,
            type: block.type,
            config: (block.config ?? {}) as Record<string, unknown>,
            visible: block.visible,
            offer_id: block.offer_id,
            pending: block.pending,
            suggested: block.suggested,
          } satisfies EditorBlock,
        ]
      : [],
  );

  return (
    <PageEditor
      initialBlocks={editorBlocks}
      offers={viewOffers}
      profile={viewProfile}
      initialHeader={{
        display_name: profile.display_name,
        headline: profile.headline ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        avatar_url: profile.avatar_url,
        category_id: profile.category_id,
        custom_fields: parseOfferFields(profile.custom_fields),
      }}
      initialTheme={getTheme(profile.theme).id}
      initialAccent={profile.accent_color}
      categories={categories ?? []}
      categorySlugById={Object.fromEntries((categories ?? []).map((item) => [item.id, item.slug]))}
      linkBase={siteUrl.replace(/^https?:\/\//, "")}
      publicUrl={absoluteUrl(`/${profile.slug}`, siteUrl)}
      locale={profile.locale}
    />
  );
}
