import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/onboarding/slug";

/**
 * What coaches say about TheSessionLink, shown on the landing.
 *
 * REAL TESTIMONIALS ONLY. Each entry is something a real coach said and agreed
 * to have published, under their real name. Never a placeholder, never a
 * "demo" quote, never a paraphrase they did not approve: a made-up testimonial
 * on a sales page is a lie to every visitor who reads it.
 *
 * While this list is empty, the landing renders no testimonials section at
 * all — no heading, no empty carousel, no "coming soon".
 *
 *   name   the person's name as they want it shown
 *   trade  what they do ("Coach sportive à Casablanca")
 *   quote  their words, in the language they said them
 *   slug   optional: their TheSessionLink page (thesessionlink.com/<slug>)
 */
export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  trade: z.string().trim().min(2).max(80),
  quote: z.string().trim().min(10).max(400),
  slug: z.string().regex(SLUG_PATTERN).optional(),
});

export type Testimonial = z.infer<typeof testimonialSchema>;

export const TESTIMONIALS: Testimonial[] = [];

/**
 * The testimonials worth showing: only well-formed entries. An empty result
 * means the section is not rendered.
 */
export function publishableTestimonials(items: readonly unknown[]): Testimonial[] {
  return items.flatMap((item) => {
    const parsed = testimonialSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
