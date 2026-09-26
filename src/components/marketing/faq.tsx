"use client";

import { useTranslations } from "next-intl";

import { FaqAccordion } from "@/components/ui/overlays";

import { SectionHeading } from "./section";

const KEYS = ["niche", "payments", "calendar", "clients", "link", "cancel", "language"] as const;

export function Faq() {
  const t = useTranslations("landing.faq");

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading title={t("title")} align="center" />
        <div className="mt-10">
          <FaqAccordion
            items={KEYS.map((key) => ({
              question: t(`items.${key}.q` as "items.niche.q"),
              answer: t(`items.${key}.a` as "items.niche.a"),
            }))}
          />
        </div>
      </div>
    </section>
  );
}
