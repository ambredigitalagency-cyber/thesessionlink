"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { NICHE_PHOTOS } from "@/assets/landing";
import { BlockGlyph } from "@/components/page/editor/block-meta";
import { demoPage, type DemoTrade } from "@/content/landing-demo";

import { SectionPill } from "./all-in-one";
import { EASE, SectionHeading } from "./section";

/**
 * Four trades, four pages. Example pages, labelled as such on each card —
 * the photos show a trade, never a face, and the names are made up. The
 * blocks listed are those of the live demo for the same trade, so the two
 * sections never contradict each other.
 */
const EXAMPLES: { trade: DemoTrade; photo: keyof typeof NICHE_PHOTOS }[] = [
  { trade: "coach", photo: "coach" },
  { trade: "hairdresser", photo: "hairdresser" },
  { trade: "realtor", photo: "realtor" },
  { trade: "tutor", photo: "tutor" },
];

export function Examples() {
  const t = useTranslations("landing.examples");
  const tBlocks = useTranslations("landing.examples.blocks");
  const locale = useLocale();

  return (
    <section id="examples" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionPill>{t("pill")}</SectionPill>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} className="mt-4" />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLES.map(({ trade, photo }, index) => {
            const page = demoPage(trade, locale);
            return (
              <motion.article
                key={trade}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
                className="surface-card relative flex flex-col overflow-hidden rounded-[1.75rem] p-0"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={NICHE_PHOTOS[photo]}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                    placeholder="blur"
                    loading="lazy"
                    className="object-cover"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur">
                    {t("badge")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-ink text-[16px] font-semibold">{page.profile.display_name}</p>
                  <p className="text-ink-muted text-[13px]">
                    {page.profile.categoryName} · {page.profile.location}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {page.blocks.map((block) => (
                      <li
                        key={block.id}
                        className="text-ink-muted flex items-center gap-2.5 text-[13px]"
                      >
                        <BlockGlyph type={block.type} size="sm" />
                        {tBlocks(block.type as "link")}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
