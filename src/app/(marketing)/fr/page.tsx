import { Landing } from "@/components/marketing/landing";
import { landingMetadata } from "@/lib/seo/landing";

/** The landing in a fixed language, for hreflang (the proxy passes it on). */
export function generateMetadata() {
  return landingMetadata("/fr", "fr");
}

export default function LandingPage() {
  return <Landing />;
}
