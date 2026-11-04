import { getLocale, getTranslations } from "next-intl/server";

import { siteUrl } from "@/lib/env";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

/**
 * What search engines read about the product: a web application with one
 * monthly price and a free trial. Nothing else — no rating, no review count,
 * no user count: there are none to report.
 */
export async function LandingJsonLd() {
  const locale = await getLocale();
  const t = await getTranslations("meta");

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "TheSessionLink",
        url: siteUrl,
      },
      {
        "@type": "WebApplication",
        name: "TheSessionLink",
        url: siteUrl,
        description: t("description"),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        publisher: { "@id": `${siteUrl}/#organization` },
        offers: {
          "@type": "Offer",
          price: String(PLAN_PRICE_MONTHLY),
          priceCurrency: "EUR",
          description: t("offer"),
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static data of our own; < is escaped so nothing can close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
