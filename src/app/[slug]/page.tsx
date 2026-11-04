import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { PageView } from "@/components/page/page-view";
import { ProfileUnavailable } from "@/components/public-profile/unavailable";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { parseOfferFields } from "@/lib/offers/fields";
import { localized } from "@/lib/offers/schema";
import { parseBlocks } from "@/lib/page/blocks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The page, read as a visitor reads it: through the public view and the
 * policies, never the service key. Blocks and offers only come back for a
 * published page, so a page being set up shows its header and nothing else.
 */
async function loadPage(slug: string) {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile?.id) return null;

  const [{ data: blocks }, { data: offers }, { data: category }] = await Promise.all([
    supabase
      .from("page_blocks")
      .select("id, type, config, visible, offer_id")
      .eq("profile_id", profile.id)
      .eq("visible", true)
      // The policies already hide blocks to complete from visitors; the coach's
      // own session may read them, and must not see them here either.
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

  return {
    profile,
    blocks: parseBlocks(blocks ?? []),
    offers: offers ?? [],
    category: category?.name ?? null,
  };
}

/**
 * The link exists but the profile no longer answers — suspended, or on its way
 * out. Told apart from a link that never existed, and from each other only in
 * the database: the visitor gets one neutral page either way.
 */
async function profileIsUnavailable(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("profile_unavailable", { p_slug: slug });
  return data === true;
}

/**
 * Public pages are not locale-prefixed (the URL is the product), so the
 * language is: visitor's cookie first, otherwise the language the pro works in.
 */
async function resolveLocale(profileLocale: string | null): Promise<Locale> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return isLocale(profileLocale) ? profileLocale : "en";
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPage(slug);

  if (!data) {
    if (await profileIsUnavailable(slug)) {
      const t = await getTranslations({
        locale: await resolveLocale(null),
        namespace: "publicProfile.unavailable",
      });
      return { title: t("title"), robots: { index: false, follow: false } };
    }
    return { title: "Not found" };
  }

  const { profile } = data;
  const description =
    profile.headline ?? profile.bio?.slice(0, 160) ?? profile.display_name ?? undefined;

  return {
    title: profile.display_name,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      type: "profile",
      title: profile.display_name ?? undefined,
      description,
      url: `/${slug}`,
    },
    // A page still being set up has nothing to find yet; it is indexed once
    // its first offer is published.
    robots: profile.published ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PublicProfilePage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await loadPage(slug);

  if (!data) {
    if (await profileIsUnavailable(slug)) {
      return <ProfileUnavailable locale={await resolveLocale(null)} />;
    }
    notFound();
  }

  const { profile, blocks, offers, category } = data;
  const locale = await resolveLocale(profile.locale);
  const messages = pickMessages(await getMessages({ locale }), [
    ...BASE_NAMESPACES,
    "publicProfile",
    "offers.actions",
  ]);

  const viewProfile: PublicProfile = {
    id: profile.id as string,
    slug: profile.slug as string,
    display_name: profile.display_name as string,
    headline: profile.headline,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    location: profile.location,
    categoryName: category ? localized(category, locale, "") || null : null,
    whatsapp_number: profile.whatsapp_number,
    currency: profile.currency ?? "EUR",
    timezone: profile.timezone ?? "Europe/Paris",
    details: parseOfferFields(profile.custom_fields),
    locale: isLocale(profile.locale) ? profile.locale : "en",
    published: Boolean(profile.published),
  };

  const viewOffers: PublicOffer[] = offers.map((offer) => ({
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
  }));

  const requestedOffer = typeof query.offer === "string" ? query.offer : undefined;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="min-h-dvh">
        <PageView
          profile={viewProfile}
          blocks={blocks}
          offers={viewOffers}
          theme={profile.theme ?? "classic"}
          accent={profile.accent_color ?? ""}
          initialOfferId={
            viewOffers.some((offer) => offer.id === requestedOffer) ? requestedOffer : undefined
          }
        />
      </main>
    </NextIntlClientProvider>
  );
}
