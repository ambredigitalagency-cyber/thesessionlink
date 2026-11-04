"use client";

import { BarChart3, QrCode } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/brand/logo";
import { BlockGlyph } from "@/components/page/editor/block-meta";
import type { BlockType } from "@/lib/page/blocks";

import { EASE, SectionHeading } from "./section";

/** The blocks shown around the logo: the ones a page is made of, plus QR and statistics. */
const ORBIT: (BlockType | "qr" | "stats")[] = [
  "whatsapp",
  "link",
  "socials",
  "service",
  "qr",
  "pricing",
  "call",
  "stats",
  "address",
  "faq",
  "email",
  "youtube",
];

/**
 * "All in one": the logo in the middle, the blocks of a page around it. One
 * card, one idea — the page of links, the services, the QR code and the
 * statistics are the same product, not four tools.
 */
export function AllInOne() {
  const t = useTranslations("landing.allInOne");

  return (
    <section id="features" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="surface-card overflow-hidden rounded-[2rem] p-6 sm:p-10"
        >
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionPill>{t("pill")}</SectionPill>
              <SectionHeading title={t("title")} subtitle={t("subtitle")} className="mt-4" />
              <ul className="mt-6 flex flex-wrap gap-2">
                {(["links", "services", "qr", "stats"] as const).map((key, index) => (
                  <li
                    key={key}
                    className="rounded-full px-3 py-1.5 text-[12.5px] font-medium"
                    style={{
                      background: `color-mix(in oklab, ${TAG_COLORS[index]} 14%, transparent)`,
                      color: `color-mix(in oklab, ${TAG_COLORS[index]} 80%, black)`,
                    }}
                  >
                    {t(`tags.${key}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[380px]">
              <div className="border-line absolute inset-[12%] rounded-full border border-dashed" />
              <div className="border-line absolute inset-[30%] rounded-full border" />
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE }}
                className="bg-surface absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full px-5 py-3 shadow-[var(--shadow-float)]"
              >
                <Logo className="text-[15px]" />
              </motion.div>
              {ORBIT.map((item, index) => {
                const angle = (index / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
                const radius = 38;
                return (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.15 + index * 0.04, ease: EASE }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${50 + radius * Math.cos(angle)}%`,
                      top: `${50 + radius * Math.sin(angle)}%`,
                    }}
                  >
                    {item === "qr" || item === "stats" ? (
                      <ExtraGlyph kind={item} />
                    ) : (
                      <BlockGlyph type={item} />
                    )}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const TAG_COLORS = ["#f2542d", "#2f6fd6", "#1f8a5b", "#8b5cf6"];

/** The section's small label, the same on every card of the landing. */
export function SectionPill({
  children,
  tone = "paper",
}: {
  children: React.ReactNode;
  tone?: "paper" | "night";
}) {
  return (
    <span
      className={
        tone === "night"
          ? "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/70"
          : "border-line bg-surface text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium"
      }
    >
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--accent)]" />
      {children}
    </span>
  );
}

/** QR code and statistics, drawn like the block pictograms. */
function ExtraGlyph({ kind }: { kind: "qr" | "stats" }) {
  const Icon = kind === "qr" ? QrCode : BarChart3;
  return (
    <span className="relative inline-flex size-12 shrink-0">
      <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-[12px] bg-[color-mix(in_oklab,var(--color-brand)_14%,transparent)]" />
      <span className="relative flex size-full items-center justify-center rounded-[12px] border border-[color-mix(in_oklab,var(--color-brand)_28%,transparent)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
    </span>
  );
}
