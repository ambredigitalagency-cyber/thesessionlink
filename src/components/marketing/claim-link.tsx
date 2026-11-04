"use client";

import { ArrowRight, Check, CircleAlert, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition, type CSSProperties } from "react";

import { checkPublicSlug, type PublicSlugCheck } from "@/actions/public-slug";
import { Button } from "@/components/ui/button";
import { claimHref, slugShape, SLUG_MAX } from "@/lib/onboarding/slug";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { slugify } from "@/lib/utils";

import { EASE, SectionHeading } from "./section";

type State = PublicSlugCheck["status"] | "checking" | "idle";

/**
 * "Try your page": one field, the link, checked as it is typed. A free link
 * leads straight to the sign-up, which carries it to the name-and-link screen
 * already filled in. Nothing is reserved here — the link is only taken when
 * the account writes it — and the copy says no more than that.
 */
export function ClaimLink({ linkBase }: { linkBase: string }) {
  const t = useTranslations("landing.claim");
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [answer, setAnswer] = useState<(PublicSlugCheck & { slug: string }) | null>(null);
  const [pending, startTransition] = useTransition();

  const shape = slug ? slugShape(slug) : null;
  const current = answer?.slug === slug ? answer : null;
  const state: State = !shape
    ? "idle"
    : shape === "invalid"
      ? "invalid"
      : current
        ? current.status
        : shape === "reserved"
          ? "reserved"
          : "checking";
  const suggestions = current?.suggestions ?? [];

  useEffect(() => {
    if (!slug || slugShape(slug) === "invalid") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkPublicSlug(slug);
      if (!cancelled) setAnswer({ ...result, slug });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  function claim(value: string) {
    startTransition(() => router.push(claimHref(value)));
  }

  const tone =
    state === "free"
      ? "text-success"
      : state === "taken" || state === "reserved" || state === "invalid"
        ? "text-danger"
        : "text-ink-muted";

  return (
    <section id="try" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          align="center"
        />

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          onSubmit={(event) => {
            event.preventDefault();
            if (state === "free") claim(slug);
          }}
          className="surface-card mx-auto mt-10 max-w-xl p-4 sm:p-5"
          noValidate
        >
          <label htmlFor="claim-slug" className="text-ink text-[13.5px] font-medium">
            {t("label")}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="border-line-strong bg-surface focus-within:border-ink relative flex h-12 w-full min-w-0 items-center rounded-full border pl-4 transition-colors sm:flex-1">
              {/* A long domain shortens from the middle of the line, never the
                  slash: "thesessionlink…/your-name" still reads as a link. */}
              <span className="text-ink-subtle flex max-w-[50%] shrink-0 text-[15px]">
                <span className="truncate">{linkBase}</span>
                <span aria-hidden>/</span>
              </span>
              <input
                id="claim-slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value).slice(0, SLUG_MAX))}
                placeholder={t("placeholder")}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                aria-describedby="claim-status"
                className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent pr-10 text-[15px] font-medium focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={state}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.16 }}
                    className="flex"
                  >
                    {state === "checking" ? (
                      <Loader2 className="text-ink-subtle size-4 animate-spin" aria-hidden />
                    ) : state === "free" ? (
                      <Check className="text-success size-4" aria-hidden />
                    ) : state === "taken" || state === "reserved" ? (
                      <X className="text-danger size-4" aria-hidden />
                    ) : state === "invalid" || state === "limited" ? (
                      <CircleAlert className="text-danger size-4" aria-hidden />
                    ) : null}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
            <Button type="submit" size="lg" disabled={state !== "free"} loading={pending}>
              {t("cta")}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>

          <p
            id="claim-status"
            aria-live="polite"
            className={`mt-2.5 min-h-5 px-1 text-[13px] ${tone}`}
          >
            {state === "idle" ? t("hint") : t(`status.${state}`)}
          </p>

          <AnimatePresence initial={false}>
            {suggestions.length > 0 && (state === "taken" || state === "reserved") ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="overflow-hidden px-1"
              >
                <p className="text-ink-muted pt-1 text-[12.5px]">{t("suggestions")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setSlug(suggestion)}
                      aria-label={t("useSuggestion", { slug: suggestion })}
                      style={{ "--rise-delay": `${index * 0.05}s` } as CSSProperties}
                      className="rise-in border-line-strong text-ink hover:border-ink/40 rounded-full border px-3 py-1.5 font-mono text-[12.5px] transition-[border-color,transform] active:scale-[0.96]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <p className="text-ink-subtle mt-3 px-1 text-[12px]">
            {t("note", { price: PLAN_PRICE_MONTHLY })}
          </p>
        </motion.form>
      </div>
    </section>
  );
}
