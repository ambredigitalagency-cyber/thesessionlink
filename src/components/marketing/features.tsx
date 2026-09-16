"use client";

import {
  CalendarCheck,
  EyeOff,
  Globe,
  MessageCircle,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { ACTION_ICONS } from "@/lib/offers/meta";
import { ACTION_TYPES } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

const SMALL_FEATURES = [
  { key: "crm", icon: UsersRound },
  { key: "reminders", icon: CalendarCheck },
  { key: "pause", icon: EyeOff },
  { key: "fields", icon: SlidersHorizontal },
  { key: "whatsapp", icon: MessageCircle },
  { key: "bilingual", icon: Globe },
] as const;

export function Features() {
  const t = useTranslations("landing.features");
  const tActions = useTranslations("offers.actions");

  return (
    <section id="features" className="bg-night text-ink-inverse relative py-20 sm:py-28">
      <div className="bg-grid-inverse pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] opacity-40" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-[12.5px] font-medium tracking-[0.12em] text-[var(--accent)] uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[42px]">
            {t("title")}
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-white/60">{t("subtitle")}</p>
        </motion.div>

        {/* The five action types — the core of the model */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ACTION_TYPES.map((actionType, index) => {
            const Icon = ACTION_ICONS[actionType];
            return (
              <motion.div
                key={actionType}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "border-line-inverse bg-night-soft rounded-[var(--radius-lg)] border p-5 transition-colors hover:border-white/20",
                  index === 0 && "lg:row-span-1",
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">
                  {tActions(`${actionType}.label`)}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                  {tActions(`${actionType}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SMALL_FEATURES.map(({ key, icon: Icon }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="border-line-inverse bg-night-soft rounded-[var(--radius-lg)] border p-5"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 text-[var(--accent)]" />
                <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
                  {t(`items.${key}.title` as "items.crm.title")}
                </h3>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">
                {t(`items.${key}.body` as "items.crm.body")}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
