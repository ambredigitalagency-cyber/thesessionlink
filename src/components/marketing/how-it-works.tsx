"use client";

import { Clock } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { PRIMARY_GLYPHS } from "@/components/marketing/action-glyphs";
import { THEME_IDS, THEMES } from "@/lib/page/themes";

import { SectionPill } from "./all-in-one";
import { EASE, SectionHeading } from "./section";

/**
 * The three steps, as the product really walks them: the trade and the main
 * button (the page is live at that point), the look, then sharing the link and
 * watching what it brings in.
 */
export function HowItWorks() {
  const t = useTranslations("landing.how");

  const steps: { key: "start" | "customize" | "share"; art: ReactNode }[] = [
    { key: "start", art: <StartArt /> },
    { key: "customize", art: <CustomizeArt /> },
    { key: "share", art: <ShareArt /> },
  ];

  return (
    <section id="how" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionPill>{t("pill")}</SectionPill>
            <SectionHeading title={t("title")} className="mt-4" />
          </div>
          <p className="bg-success-soft text-success inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium">
            <Clock className="size-4" aria-hidden />
            {t("badge")}
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
              className="surface-card flex flex-col rounded-[1.75rem] p-6"
            >
              <div className="bg-canvas flex h-40 items-center justify-center rounded-[1.25rem]">
                {step.art}
              </div>
              <p className="text-ink-subtle mt-5 text-[12px] font-semibold tracking-[0.1em] uppercase">
                {t("step", { number: index + 1 })}
              </p>
              <h3 className="text-ink mt-1.5 text-[19px] font-semibold tracking-[-0.02em]">
                {t(`steps.${step.key}.title`)}
              </h3>
              <p className="text-ink-muted mt-2 text-[14.5px] leading-relaxed">
                {t(`steps.${step.key}.body`)}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StartArt() {
  const t = useTranslations("landing.how.art");
  const Glyph = PRIMARY_GLYPHS.whatsapp;
  return (
    <div aria-hidden className="flex items-center gap-4">
      <div className="space-y-2">
        {(["coach", "hair", "creator"] as const).map((key, index) => (
          <span
            key={key}
            className={`block rounded-full border px-3 py-1 text-[12px] font-medium ${
              index === 0
                ? "border-ink bg-ink text-ink-inverse"
                : "border-line-strong text-ink-muted bg-surface"
            }`}
          >
            {t(key)}
          </span>
        ))}
      </div>
      <Glyph className="w-24" />
    </div>
  );
}

function CustomizeArt() {
  const ids = THEME_IDS.slice(0, 6);
  return (
    <div aria-hidden className="grid grid-cols-3 gap-2">
      {ids.map((id, index) => (
        <motion.span
          key={id}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.1 + index * 0.05, ease: EASE }}
          className="flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-[10px] border border-black/5"
          style={{ background: THEMES[id].background }}
        >
          <span
            className="h-1.5 w-6 rounded-full"
            style={{ background: THEMES[id].text, opacity: 0.6 }}
          />
          <span className="h-2.5 w-9 rounded-full bg-[var(--accent)]" />
        </motion.span>
      ))}
    </div>
  );
}

function ShareArt() {
  const t = useTranslations("landing.how.art");
  const bars = [30, 52, 40, 70, 58, 86];
  return (
    <div aria-hidden className="flex w-full max-w-[220px] flex-col gap-3 px-2">
      <span className="border-line-strong bg-surface text-ink truncate rounded-full border px-3 py-1.5 font-mono text-[11.5px]">
        {t("link")}
      </span>
      <div className="flex h-16 items-end gap-1.5">
        {bars.map((height, index) => (
          <motion.span
            key={index}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.06, ease: EASE }}
            className="flex-1 origin-bottom rounded-t-[4px] bg-[var(--accent)]"
            style={{ height: `${height}%`, opacity: 0.45 + index * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}
