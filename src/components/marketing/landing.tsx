import { AllInOne } from "@/components/marketing/all-in-one";
import { ClaimLink } from "@/components/marketing/claim-link";
import { Examples } from "@/components/marketing/examples";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ScrollProgress } from "@/components/marketing/interactive";
import { LandingJsonLd } from "@/components/marketing/json-ld";
import { MarketingNav } from "@/components/marketing/nav";
import { Pricing } from "@/components/marketing/pricing";
import { SupportBubble } from "@/components/marketing/support-bubble";
import { Testimonials } from "@/components/marketing/testimonials";
import { LazyTrackingPreview } from "@/components/marketing/lazy-tracking-preview";
import { publishableTestimonials, TESTIMONIALS } from "@/content/testimonials";
import { siteUrl } from "@/lib/env";

/**
 * The landing, in the order a visitor's questions come:
 *
 *   what is it (hero, with a live page for their trade) → everything it does
 *   (all in one) → how to get one (three steps) → what it brings back (the
 *   statistics, with example data) → what it looks like for other trades
 *   (examples) → claim a link → what it costs → what others say (only once
 *   real testimonials exist) → the remaining doubts (FAQ) → the way in.
 *
 * Every page, figure and name shown before the sign-up is an example and is
 * labelled so; no testimonial, user count or performance promise is made up.
 */
export function Landing() {
  const testimonials = publishableTestimonials(TESTIMONIALS);
  const linkBase = siteUrl.replace(/^https?:\/\//, "");

  return (
    <>
      <LandingJsonLd />
      <ScrollProgress />
      <MarketingNav />
      <main>
        <Hero linkBase={linkBase} />
        <AllInOne />
        <HowItWorks />
        <LazyTrackingPreview />
        <Examples />
        <ClaimLink linkBase={linkBase} />
        <Pricing />
        {testimonials.length > 0 ? <Testimonials items={testimonials} /> : null}
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
      <SupportBubble />
    </>
  );
}
