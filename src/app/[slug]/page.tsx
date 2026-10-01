import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { PublicProfileView } from "@/components/public-profile/profile-view";
import { ProfileUnavailable } from "@/components/public-profile/unavailable";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { acceptsAddons, parseAddons } from "@/lib/offers/addons";
import { parseOfferFields } from "@/lib/offers/fields";
import { payableProviders } from "@/lib/payments/accounts";
import { localized } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseTheme } from "@/lib/validation";

async function loadProfile(slug: string) {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile?.id) return null;

  const [{ data: offers }, { data: category }] = await Promise.all([
    supabase
      .from("offers")
      .select(
        "id, title, description, price, price_type, main_photo_url, photos, action_type, action_config, custom_fields, addons",
      )
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .order("position"),
    profile.category_id
      ? supabase
          .from("activity_categories")
          .select("name")
          .eq("id", profile.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return { profile, offers: offers ?? [], category: category?.name ?? null };
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
  const data = await loadProfile(slug);

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

  const { profile, offers } = data;
  const description =
    profile.headline ?? profile.bio?.slice(0, 160) ?? `Book with ${profile.display_name}`;

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
    robots: offers.length > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PublicProfilePage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await loadProfile(slug);

  if (!data) {
    if (await profileIsUnavailable(slug)) {
      return <ProfileUnavailable locale={await resolveLocale(null)} />;
    }
    notFound();
  }

  const { profile, offers, category } = data;
  const locale = await resolveLocale(profile.locale);
  const messages = pickMessages(await getMessages({ locale }), [
    ...BASE_NAMESPACES,
    "publicProfile",
    "offers.actions",
  ]);

  const theme = parseTheme(profile.theme);

  // A page still being set up — link reserved, no offer published — shows no
  // way to reach the coach, who has not yet decided how they want to be
  // reached. Dropped here rather than hidden in the view, so the details never
  // reach the page's payload either.
  const reachable = offers.length > 0;

  const viewProfile: PublicProfile = {
    id: profile.id as string,
    slug: profile.slug as string,
    display_name: profile.display_name as string,
    headline: profile.headline,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    location: profile.location,
    categoryName: category ? localized(category, locale, "") || null : null,
    social_links: (profile.social_links ?? {}) as PublicProfile["social_links"],
    whatsapp_number: reachable ? profile.whatsapp_number : null,
    contact_email: reachable ? profile.contact_email : null,
    phone_number: reachable ? profile.phone_number : null,
    calendar_visible: profile.calendar_visible ?? true,
    custom_closed_message: profile.custom_closed_message,
    timezone: profile.timezone ?? "UTC",
    currency: profile.currency ?? "EUR",
    accent: theme.accent,
    layout: theme.layout,
    cards: theme.cards,
    details: parseOfferFields(profile.custom_fields),
    locale: isLocale(profile.locale) ? profile.locale : "en",
    paymentProviders: await payableProviders(profile.id as string),
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
    addons: acceptsAddons(offer.action_type) ? parseAddons(offer.addons) : [],
  }));

  const requestedOffer = typeof query.offer === "string" ? query.offer : undefined;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="min-h-dvh">
        <PublicProfileView
          profile={viewProfile}
          offers={viewOffers}
          initialOfferId={
            viewOffers.some((offer) => offer.id === requestedOffer) ? requestedOffer : undefined
          }
        />
      </main>
    </NextIntlClientProvider>
  );
}
