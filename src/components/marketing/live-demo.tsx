"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { PageView } from "@/components/page/page-view";
import { PhoneFrame } from "@/components/page/phone-frame";
import { ChoiceChips } from "@/components/ui/choice-cards";
import { DEMO_TRADES, demoPage, type DemoTrade } from "@/content/landing-demo";

/**
 * A real page in a phone, for the trade the visitor picks: the theme, the
 * blocks and the words change with it. PageView in preview mode — the very
 * renderer of coaches' pages, with taps disabled and nothing tracked — and an
 * "Example" label on the phone, because none of it is a real person.
 */
export function LiveDemo() {
  const t = useTranslations("landing.hero.demo");
  const locale = useLocale();
  const [trade, setTrade] = useState<DemoTrade>("coach");
  const page = useMemo(() => demoPage(trade, locale), [trade, locale]);

  return (
    <div className="flex flex-col items-center gap-5">
      <ChoiceChips
        label={t("label")}
        value={trade}
        onChange={setTrade}
        options={DEMO_TRADES.map((key) => ({ value: key, label: t(`trades.${key}`) }))}
        className="justify-center"
      />

      <figure className="relative w-full max-w-[300px]">
        <span className="bg-ink text-ink-inverse absolute -top-3 right-4 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase shadow-[var(--shadow-float)]">
          {t("badge")}
        </span>
        <PhoneFrame
          className="max-w-[300px]"
          screenClassName="h-[520px] rounded-[1.9rem]"
          scale={0.72}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={trade}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PageView
                preview
                profile={page.profile}
                blocks={page.blocks}
                offers={page.offers}
                theme={page.theme}
                accent={page.accent}
              />
            </motion.div>
          </AnimatePresence>
        </PhoneFrame>
        <figcaption className="text-ink-subtle mt-3 text-center text-[12px]">
          {t("caption")}
        </figcaption>
      </figure>
    </div>
  );
}
