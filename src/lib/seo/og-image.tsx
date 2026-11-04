import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/lib/i18n/config";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The landing's link preview: the name, the promise, a link pill. Drawn, not
 * a screenshot, so it never shows anyone's page.
 */
/** In the visitor's language, or in the one a fixed-language address imposes. */
export async function landingImage(locale?: Locale) {
  const t = locale
    ? await getTranslations({ locale, namespace: "landing.hero" })
    : await getTranslations("landing.hero");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fbfaf9",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34, fontWeight: 700 }}
      >
        TheSessionLink
        <div style={{ width: 14, height: 14, borderRadius: 999, background: "#f2542d" }} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 70,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          color: "#0c0c0d",
          maxWidth: 1000,
        }}
      >
        {t("title")}
      </div>
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "2px solid #e7e4e0",
            borderRadius: 999,
            padding: "14px 26px",
            fontSize: 28,
            color: "#5b5b60",
            background: "white",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#f2542d" }} />
          thesessionlink.com/{t("pillName")}
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
