import { landingImage } from "@/lib/seo/og-image";

export const alt = "TheSessionLink";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The landing's link preview, in this address's language. */
export default function OpengraphImage() {
  return landingImage("fr");
}
