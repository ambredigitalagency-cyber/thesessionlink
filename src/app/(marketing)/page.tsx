import { Examples } from "@/components/marketing/examples";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingNav } from "@/components/marketing/nav";
import { Pricing } from "@/components/marketing/pricing";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Examples />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
