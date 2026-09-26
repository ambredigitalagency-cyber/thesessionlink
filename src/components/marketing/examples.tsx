"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { EASE, SectionHeading } from "./section";

/**
 * Illustrative profiles, one per niche. They are labelled as examples on
 * purpose — nothing here pretends to be a real customer.
 *
 * This list is also the seed for niche landing variants later: same sections,
 * different copy and accent.
 */
export const NICHE_EXAMPLES = [
  { key: "coach", accent: "coral", slug: "ana-coach" },
  { key: "realtor", accent: "ocean", slug: "marc-immo" },
  { key: "hairdresser", accent: "violet", slug: "studio-lina" },
  { key: "tutor", accent: "forest", slug: "prof-david" },
] as const;

/**
 * Four pages, four trades, one product.
 *
 * The cards used to sit at different heights and drift at different speeds,
 * which was meant to say "four separate pages" and mostly said "four cards
 * that will not hold still". What actually carries the point is that each one
 * wears its own accent: the same layout, four identities. So they line up now,
 * and the colour does the talking — which is also the honest demonstration,
 * since the accent is the one thing a coach picks about their page.
 */
export function Examples() {
  const t = useTranslations("landing.examples");

  return (
    <section id="examples" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NICHE_EXAMPLES.map((example, index) => (
            <motion.article
              key={example.key}
              data-accent={example.accent}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
              className="group surface-card flex h-full flex-col overflow-hidden p-0 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
            >
              {/* A band of the page's own accent, standing in for the header
                  photo a real profile would have. */}
              <div
                className="relative h-16"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 55%, transparent))",
                }}
              >
                <span className="border-surface bg-surface absolute -bottom-6 left-5 flex size-12 items-center justify-center rounded-full border-4 text-[14px] font-semibold text-[var(--accent-ink)]">
                  {t(`items.${example.key}.initials` as "items.coach.initials")}
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/15 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm">
                  {t("badge")}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5 pt-9">
                <h3 className="text-ink text-[16px] font-semibold tracking-[-0.02em]">
                  {t(`items.${example.key}.name` as "items.coach.name")}
                </h3>
                <p className="text-ink-muted mt-1 text-[13px] leading-relaxed">
                  {t(`items.${example.key}.headline` as "items.coach.headline")}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {[0, 1].map((offer) => (
                    <li
                      key={offer}
                      className="bg-ink/[0.03] flex items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2.5 py-2 text-[12.5px]"
                    >
                      <span className="text-ink truncate">
                        {t(
                          `items.${example.key}.offers.${offer}.title` as "items.coach.offers.0.title",
                        )}
                      </span>
                      <span className="text-ink-muted shrink-0 font-medium">
                        {t(
                          `items.${example.key}.offers.${offer}.price` as "items.coach.offers.0.price",
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 inline-flex items-center gap-1 pt-1 text-[12.5px] font-medium text-[var(--accent-ink)]">
                  thesessionlink.com/{example.slug}
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
