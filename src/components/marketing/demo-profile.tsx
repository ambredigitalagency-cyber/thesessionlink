"use client";

import { ArrowLeft, ArrowUpRight, Check, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

type DemoNiche = "coach" | "realtor" | "hairdresser";

const NICHES: { key: DemoNiche; accent: string }[] = [
  { key: "coach", accent: "coral" },
  { key: "realtor", accent: "ocean" },
  { key: "hairdresser", accent: "violet" },
];

const SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
const DAYS = ["mon", "tue", "wed", "thu"] as const;

/**
 * Interactive demo on the hero: a real mini profile the visitor can click
 * through (switch niche, open an offer, pick a slot, confirm). No network.
 */
export function DemoProfile() {
  const t = useTranslations("landing.demo");
  const [niche, setNiche] = useState<DemoNiche>("coach");
  const [step, setStep] = useState<"list" | "offer" | "done">("list");
  const [offerIndex, setOfferIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [day, setDay] = useState(0);

  const accent = NICHES.find((item) => item.key === niche)?.accent ?? "coral";

  function reset(next: DemoNiche) {
    setNiche(next);
    setStep("list");
    setSlot(null);
    setOfferIndex(0);
  }

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="mb-3 flex justify-center gap-1.5">
        {NICHES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => reset(item.key)}
            className={cn(
              "relative rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              niche === item.key ? "text-ink-inverse" : "text-ink-muted hover:text-ink",
            )}
          >
            {niche === item.key ? (
              <motion.span
                layoutId="demo-niche"
                className="bg-ink absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative">{t(`niches.${item.key}` as "niches.coach")}</span>
          </button>
        ))}
      </div>

      <div
        data-accent={accent}
        className="border-line bg-surface relative overflow-hidden rounded-[2rem] border p-1.5 shadow-[var(--shadow-pop)]"
      >
        <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center">
          <span className="bg-ink/10 h-1 w-16 rounded-full" />
        </div>

        <div className="bg-canvas h-[30rem] scrollbar-none overflow-y-auto rounded-[1.7rem] px-4 pt-9 pb-5">
          <AnimatePresence mode="wait" initial={false}>
            {step === "list" ? (
              <motion.div
                key={`list-${niche}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className="flex size-16 items-center justify-center rounded-full text-[20px] font-semibold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {t(`profiles.${niche}.initials` as "profiles.coach.initials")}
                  </div>
                  <p className="text-ink mt-3 text-[17px] font-semibold tracking-[-0.02em]">
                    {t(`profiles.${niche}.name` as "profiles.coach.name")}
                  </p>
                  <p className="text-ink-muted mt-1 text-[13px]">
                    {t(`profiles.${niche}.headline` as "profiles.coach.headline")}
                  </p>
                  <p className="text-ink-subtle mt-2 inline-flex items-center gap-1 text-[12px]">
                    <MapPin className="size-3" />
                    {t(`profiles.${niche}.location` as "profiles.coach.location")}
                  </p>
                </div>

                <div className="mt-5 space-y-2.5">
                  {[0, 1].map((index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setOfferIndex(index);
                        setStep("offer");
                      }}
                      className="group border-line bg-surface w-full rounded-[var(--radius-md)] border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-ink text-[14px] leading-snug font-medium">
                          {t(
                            `profiles.${niche}.offers.${index}.title` as "profiles.coach.offers.0.title",
                          )}
                        </p>
                        <span className="text-ink shrink-0 text-[13.5px] font-semibold">
                          {t(
                            `profiles.${niche}.offers.${index}.price` as "profiles.coach.offers.0.price",
                          )}
                        </span>
                      </div>
                      <p className="text-ink-muted mt-1 line-clamp-2 text-[12.5px] leading-relaxed">
                        {t(
                          `profiles.${niche}.offers.${index}.description` as "profiles.coach.offers.0.description",
                        )}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--accent-ink)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-white">
                        {t(
                          `profiles.${niche}.offers.${index}.cta` as "profiles.coach.offers.0.cta",
                        )}
                        <ArrowUpRight className="size-3" />
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-ink-subtle mt-4 text-center text-[11px]">{t("tapHint")}</p>
              </motion.div>
            ) : step === "offer" ? (
              <motion.div
                key="offer"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  type="button"
                  onClick={() => setStep("list")}
                  className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-[12.5px]"
                >
                  <ArrowLeft className="size-3.5" />
                  {t("back")}
                </button>

                <p className="text-ink mt-3 text-[16px] leading-snug font-semibold tracking-[-0.02em]">
                  {t(
                    `profiles.${niche}.offers.${offerIndex}.title` as "profiles.coach.offers.0.title",
                  )}
                </p>

                <div className="mt-4 flex gap-1.5">
                  {DAYS.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDay(index)}
                      className={cn(
                        "flex-1 rounded-[var(--radius-xs)] border px-1 py-1.5 text-[11.5px] font-medium transition-colors",
                        day === index
                          ? "border-ink bg-ink text-ink-inverse"
                          : "border-line-strong text-ink-muted",
                      )}
                    >
                      {t(`days.${item}` as "days.mon")}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {SLOTS.slice(day === 1 ? 2 : 0, day === 2 ? 4 : 6).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSlot(time)}
                      className={cn(
                        "rounded-[var(--radius-xs)] border py-2 text-[12.5px] font-medium tabular-nums transition-all",
                        slot === time
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-line-strong text-ink hover:border-ink/40",
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="border-line-strong bg-surface text-ink-subtle h-9 rounded-[var(--radius-xs)] border px-3 text-[12.5px] leading-9">
                    {t("fieldName")}
                  </div>
                  <div className="border-line-strong bg-surface text-ink-subtle h-9 rounded-[var(--radius-xs)] border px-3 text-[12.5px] leading-9">
                    {t("fieldEmail")}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!slot}
                  onClick={() => setStep("done")}
                  className={cn(
                    "mt-4 h-11 w-full rounded-full text-[13.5px] font-medium text-white transition-all",
                    slot ? "bg-[var(--accent)]" : "bg-ink/20 cursor-not-allowed",
                  )}
                >
                  {slot ? t("confirm", { time: slot }) : t("pickSlot")}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-full flex-col items-center justify-center text-center"
              >
                <motion.span
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 340, damping: 16 }}
                  className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-white"
                >
                  <Check className="size-7" />
                </motion.span>
                <p className="text-ink mt-4 text-[17px] font-semibold tracking-[-0.02em]">
                  {t("doneTitle")}
                </p>
                <p className="text-ink-muted mt-1.5 max-w-[16rem] text-[13px] leading-relaxed">
                  {t("doneBody", { time: slot ?? "" })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("list");
                    setSlot(null);
                  }}
                  className="text-ink mt-5 text-[12.5px] font-medium underline underline-offset-4"
                >
                  {t("replay")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
