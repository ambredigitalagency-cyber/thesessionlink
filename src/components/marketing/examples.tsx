"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./how-it-works";

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
              transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group surface-card overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex size-11 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {t(`items.${example.key}.initials` as "items.coach.initials")}
                </span>
                <Badge tone="outline">{t("badge")}</Badge>
              </div>

              <h3 className="text-ink mt-4 text-[16px] font-semibold tracking-[-0.02em]">
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

              <p
                className={cn(
                  "mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium",
                  "text-[var(--accent-ink)]",
                )}
              >
                thesessionlink.com/{example.slug}
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
