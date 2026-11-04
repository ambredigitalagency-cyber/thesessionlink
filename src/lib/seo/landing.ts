import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/lib/i18n/config";

/**
 * The landing's metadata, for its three addresses: "/" follows the visitor's
 * language (cookie, then the default), "/fr" and "/en" fix it — those two are
 * what hreflang points search engines to, and "/" is the x-default.
 */
export async function landingMetadata(
  path: "/" | "/fr" | "/en",
  locale?: Locale,
): Promise<Metadata> {
  const t = locale
    ? await getTranslations({ locale, namespace: "meta" })
    : await getTranslations("meta");
  const title = t("title");
  const description = t("description");

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: { fr: "/fr", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "TheSessionLink",
      title,
      description,
      url: path,
      locale: locale === "fr" ? "fr_FR" : locale === "en" ? "en_GB" : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}
