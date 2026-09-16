import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { PublicProfileView } from "@/components/public-profile/profile-view";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { localized, parseOfferFields } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ThemeAccent } from "@/lib/validation";

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
        "id, title, description, price, price_type, main_photo_url, action_type, action_config, custom_fields",
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

  if (!data) return { title: "Not found" };

  const { profile } = data;
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
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await loadProfile(slug);

  if (!data) notFound();

  const { profile, offers, category } = data;
  const locale = await resolveLocale(profile.locale);
  const messages = pickMessages(await getMessages({ locale }), [
    ...BASE_NAMESPACES,
    "publicProfile",
    "offers.actions",
  ]);

  const theme = (profile.theme ?? {}) as { accent?: ThemeAccent };

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
    whatsapp_number: profile.whatsapp_number,
    contact_email: profile.contact_email,
    phone_number: profile.phone_number,
    calendar_visible: profile.calendar_visible ?? true,
    custom_closed_message: profile.custom_closed_message,
    timezone: profile.timezone ?? "UTC",
    currency: profile.currency ?? "EUR",
    accent: theme.accent ?? "coral",
    locale: isLocale(profile.locale) ? profile.locale : "en",
  };

  const viewOffers: PublicOffer[] = offers.map((offer) => ({
    id: offer.id,
    title: offer.title,
    description: offer.description,
    price: offer.price,
    price_type: offer.price_type as PublicOffer["price_type"],
    main_photo_url: offer.main_photo_url,
    action_type: offer.action_type,
    action_config: offer.action_config,
    custom_fields: parseOfferFields(offer.custom_fields),
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
