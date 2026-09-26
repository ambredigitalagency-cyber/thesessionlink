import { Examples } from "@/components/marketing/examples";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ScrollProgress } from "@/components/marketing/interactive";
import { MarketingNav } from "@/components/marketing/nav";
import { Positioning } from "@/components/marketing/positioning";
import { Pricing } from "@/components/marketing/pricing";
import { Problem } from "@/components/marketing/problem";

/**
 * The landing, in the order the question gets asked.
 *
 * Show the thing (hero), then the price straight away — the first question a
 * visitor who likes the demo asks, answered before they have to hunt for it.
 * Then name the mess it replaces (problem), show how it is set up (how), what
 * it can be made to do (features), four different trades (examples), what it
 * is *not* (positioning), the objections, and the way in.
 *
 * The old order opened on how-it-works, which answered a question nobody had
 * yet: a visitor who has not understood what the product is does not care how
 * to configure it.
 */
export default function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <MarketingNav />
      <main>
        <Hero />
        <Pricing />
        <Problem />
        <HowItWorks />
        <Features />
        <Examples />
        <Positioning />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
