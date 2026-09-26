import { Examples } from "@/components/marketing/examples";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingNav } from "@/components/marketing/nav";
import { Positioning } from "@/components/marketing/positioning";
import { Pricing } from "@/components/marketing/pricing";
import { Problem } from "@/components/marketing/problem";

/**
 * The landing, in the order the question gets asked.
 *
 * Show the thing (hero), name the mess it replaces (problem), show how it is
 * set up (how), show what it can be made to do (features), show it wearing
 * four different trades (examples), say what it is *not* (positioning), then
 * the price, the objections, and the way in.
 *
 * The old order opened on how-it-works, which answered a question nobody had
 * yet: a visitor who has not understood what the product is does not care how
 * to configure it.
 */
export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Examples />
        <Positioning />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
