import { Landing } from "@/components/marketing/landing";
import { landingMetadata } from "@/lib/seo/landing";

export function generateMetadata() {
  return landingMetadata("/");
}

export default function LandingPage() {
  return <Landing />;
}
