"use client";

import { useTranslations } from "next-intl";

import { FaqAccordion } from "@/components/ui/overlays";

import { SectionPill } from "./all-in-one";
import { SectionHeading } from "./section";

const KEYS = ["what", "who", "trial", "cancel", "data", "social", "domain", "support"] as const;

export function Faq() {
  const t = useTranslations("landing.faq");

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <SectionPill>{t("pill")}</SectionPill>
        </div>
        <SectionHeading title={t("title")} align="center" className="mt-4" />
        <div className="mt-10">
          <FaqAccordion
            items={KEYS.map((key) => ({
              question: t(`items.${key}.q`),
              answer: t(`items.${key}.a`),
            }))}
          />
        </div>
      </div>
    </section>
  );
}
