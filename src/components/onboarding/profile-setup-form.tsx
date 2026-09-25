"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { checkSlugAvailability, createProfile } from "@/actions/profile";
import { CategoryIcon } from "@/components/categories/category-icon";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-cards";
import { Input, PrefixedInput } from "@/components/ui/field";
import { PhaseQuestion, PhaseSwitch } from "@/components/ui/phase";
import { notify } from "@/lib/notify";
import { localized, parseCategoryConfig } from "@/lib/offers/schema";
import { slugify } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  slug: string;
  name: unknown;
  icon: string | null;
  config: unknown;
};

/**
 * Setting up a profile, asked one question at a time.
 *
 * It used to be a single page: a grid of thirteen small category buttons, a
 * name field, a link field, a submit. Everything visible at once, nothing
 * obviously first, and the two text fields — which is where the person has to
 * actually decide something — competing with a wall of options above them.
 *
 * Three questions now, each owning the screen: what you do, under what name,
 * at what address. The bar at the top is the same four-step bar as the rest of
 * onboarding; it simply moves a third of a step per answer, so progress never
 * stalls for three screens.
 *
 * The category is answered by tapping a card, and tapping it moves on by
 * itself. That is the pattern every app the coach already uses has taught
 * them, and a "Continue" under a question that has exactly one answer is a
 * tap asked for nothing. The beat before moving (260ms) exists so the card is
 * seen to be chosen rather than merely disappearing.
 */

const PHASES = ["category", "name", "link"] as const;
type Phase = (typeof PHASES)[number];

export function ProfileSetupForm({
  categories,
  linkBase,
  defaultName,
}: {
  categories: CategoryOption[];
  linkBase: string;
  defaultName?: string;
}) {
  const t = useTranslations("onboarding.profile");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("category");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  // A slug too short to be valid is never "taken", whatever the last answer was.
  const slugStatus = effectiveSlug.length < 3 ? "idle" : slugState;
  const category = categories.find((item) => item.id === categoryId) ?? null;

  // Live availability check, debounced.
  useEffect(() => {
    if (effectiveSlug.length < 3) return;

    const token = ++checkRef.current;
    const timer = setTimeout(async () => {
      const { available } = await checkSlugAvailability(effectiveSlug);
      if (checkRef.current === token) setSlugState(available ? "free" : "taken");
    }, 400);

    return () => clearTimeout(timer);
  }, [effectiveSlug]);

  // A pick that auto-advances leaves a timer behind if the person goes back
  // first; it must not fire into a phase they have since left.
  useEffect(() => () => clearTimeout(advanceRef.current ?? undefined), []);

  function goTo(target: Phase) {
    clearTimeout(advanceRef.current ?? undefined);
    setDirection(PHASES.indexOf(target) >= PHASES.indexOf(phase) ? 1 : -1);
    setPhase(target);
    // Focus travels with the question, so the flow is followable without eyes.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function pickCategory(id: string) {
    setCategoryId(id);
    advanceRef.current = setTimeout(() => goTo("name"), 260);
  }

  function submit() {
    if (effectiveSlug.length < 3 || slugStatus === "taken") {
      setErrors({ slug: slugStatus === "taken" ? "slug_taken" : "invalid_slug" });
      return;
    }

    startTransition(async () => {
      const result = await createProfile({
        display_name: name.trim(),
        slug: effectiveSlug,
        category_id: categoryId,
        locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (result.ok) {
        router.push("/onboarding/offer");
      } else {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        if (fieldErrors.display_name) goTo("name");
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  const index = PHASES.indexOf(phase);
  const nameValid = name.trim().length >= 2;

  return (
    <div className="space-y-7">
      <OnboardingSteps current={2} advance={(index + 1) / PHASES.length} className="mb-0" />

      <PhaseSwitch phase={phase} direction={direction}>
        {phase === "category" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              title={t("phases.category.title")}
              hint={t("phases.category.hint")}
            />
            <ChoiceGroup
              name="category"
              label={t("phases.category.title")}
              layout="tile"
              columns={3}
              value={categoryId}
              onChange={pickCategory}
              options={categories.map((item) => ({
                value: item.id,
                title: localized(item.name, locale, item.slug),
                visual: <CategoryIcon name={item.icon} className="size-5" />,
              }))}
            />
          </div>
        ) : null}

        {phase === "name" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              eyebrow={category ? localized(category.name, locale, category.slug) : undefined}
              title={t("phases.name.title")}
              hint={t("phases.name.hint")}
            />

            <div className="space-y-3">
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors({});
                  if (!slugEdited) setSlugState("checking");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && nameValid) {
                    event.preventDefault();
                    goTo("link");
                  }
                }}
                placeholder={t("namePlaceholder")}
                maxLength={80}
                aria-label={t("nameLabel")}
                aria-invalid={Boolean(errors.display_name)}
                autoFocus
                className="h-14 rounded-[var(--radius-md)] text-[19px]"
              />
              {errors.display_name ? (
                <p className="text-danger text-[13px]">
                  {tError(errors.display_name as "too_short")}
                </p>
              ) : null}
              {category ? <CategoryPreview category={category} /> : null}
            </div>
          </div>
        ) : null}

        {phase === "link" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              eyebrow={name.trim() || undefined}
              title={t("phases.link.title")}
              hint={t("phases.link.hint")}
            />

            <div className="space-y-3">
              <div className="relative">
                <PrefixedInput
                  prefix={`${linkBase}/`}
                  value={effectiveSlug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlugState("checking");
                    setErrors({});
                    setSlug(slugify(event.target.value));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && slugStatus !== "taken") {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="your-name"
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-label={t("slugLabel")}
                  autoFocus
                  size="lg"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  {slugStatus === "checking" ? (
                    <Loader2 className="text-ink-subtle size-4 animate-spin" />
                  ) : slugStatus === "free" ? (
                    <Check className="text-success size-4" />
                  ) : slugStatus === "taken" ? (
                    <X className="text-danger size-4" />
                  ) : null}
                </span>
              </div>

              <p
                className={
                  slugStatus === "taken" || errors.slug
                    ? "text-danger text-[13px]"
                    : slugStatus === "free"
                      ? "text-success text-[13px]"
                      : "text-ink-muted text-[13px]"
                }
              >
                {slugStatus === "taken"
                  ? tError("slug_taken")
                  : errors.slug
                    ? tError(errors.slug as "invalid_slug")
                    : slugStatus === "free"
                      ? t("slugFree")
                      : t("slugHint")}
              </p>
            </div>
          </div>
        ) : null}
      </PhaseSwitch>

      <div className="flex items-center justify-between gap-3 pt-1">
        {index > 0 ? (
          <Button type="button" variant="ghost" onClick={() => goTo(PHASES[index - 1])}>
            <ArrowLeft className="size-4" />
            {tCommon("back")}
          </Button>
        ) : (
          <span />
        )}

        {phase === "category" ? (
          // The category only pre-fills suggestions, so it has always been
          // skippable. Losing that to the new flow would be a regression.
          <Button type="button" variant="ghost" onClick={() => goTo("name")}>
            {tCommon("skip")}
          </Button>
        ) : phase === "name" ? (
          <Button type="button" size="lg" disabled={!nameValid} onClick={() => goTo("link")}>
            {tCommon("continue")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            loading={pending}
            disabled={slugStatus === "taken" || effectiveSlug.length < 3}
            onClick={submit}
          >
            {t("submit")}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Shows what the next step will pre-fill, so the choice feels consequential. */
function CategoryPreview({ category }: { category: CategoryOption }) {
  const t = useTranslations("onboarding.profile");
  const locale = useLocale();

  const config = parseCategoryConfig(category.config);
  if (config.suggested_fields.length === 0) return null;

  return (
    <div className="bg-ink/[0.03] rounded-[var(--radius-md)] p-4">
      <p className="text-ink-subtle text-[12px] font-medium tracking-wide uppercase">
        {t("previewTitle")}
      </p>
      <p className="text-ink-muted mt-1.5 text-[13px] leading-relaxed">
        {t("previewBody", {
          fields: config.suggested_fields
            .slice(0, 4)
            .map((field) => localized(field.label, locale, field.key).toLowerCase())
            .join(", "),
        })}
      </p>
    </div>
  );
}
