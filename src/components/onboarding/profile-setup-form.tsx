"use client";

import { ArrowDown, ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";

import { checkSlugAvailability, createProfile, updateOnboardingProfile } from "@/actions/profile";
import { SocialIcon } from "@/components/brand/social-icons";
import { CategoryIcon } from "@/components/categories/category-icon";
import { NoOffersArt } from "@/components/dashboard/empty-illustrations";
import { AvatarUpload } from "@/components/media/image-upload";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-cards";
import { Field, Input, PrefixedInput, Textarea } from "@/components/ui/field";
import { PhaseField, PhaseQuestion, PhaseSwitch } from "@/components/ui/phase";
import { notify } from "@/lib/notify";
import { localized, parseCategoryConfig } from "@/lib/offers/schema";
import { slugify } from "@/lib/utils";
import type { SocialKey } from "@/lib/validation";

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
 * Now it is eight screens, and the order is the point. The three that make a
 * profile come first — what you do, under what name, at what address — and the
 * profile row is written the moment the link is settled, so nobody can take it
 * while the rest is being filled in. Everything after that enriches a profile
 * that already exists and already works: a photo, a few words, how to reach
 * you, where to find you. Each of those can be skipped, and each saves on its
 * own, so closing the tab on the fifth screen does not throw away the four
 * before it.
 *
 * The offer used to come before any of this. It came first when the product
 * was "a booking link", and it was the wrong first thing: a page with an offer
 * and no face on it is not a page anyone shares.
 *
 * The bar at the top is the same four-step bar as the rest of onboarding; it
 * moves an eighth of a step per answer, so progress never stalls.
 */

const PHASES = ["category", "name", "link", "photo", "bio", "contact", "socials", "ready"] as const;
type Phase = (typeof PHASES)[number];

/** The three that make a profile. Everything after them is optional. */
const LAST_REQUIRED = PHASES.indexOf("link");

/** Shown on the socials screen, in this order. WhatsApp sits with the phone. */
const SOCIALS: SocialKey[] = ["instagram", "tiktok", "facebook"];

export function ProfileSetupForm({
  categories,
  linkBase,
  defaultName,
  existing,
}: {
  categories: CategoryOption[];
  linkBase: string;
  defaultName?: string;
  /** Set when the profile row already exists and only the extras are left. */
  existing?: { categoryId: string | null; displayName: string; slug: string } | null;
}) {
  const t = useTranslations("onboarding.profile");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(existing ? "photo" : "category");
  const [direction, setDirection] = useState<1 | -1>(1);

  /* --- the three that make a profile --- */
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [name, setName] = useState(existing?.displayName ?? defaultName ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(existing));
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [created, setCreated] = useState(Boolean(existing));

  /* --- the four that enrich it --- */
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("");
  const [socials, setSocials] = useState<Partial<Record<SocialKey, string>>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  // A slug too short to be valid is never "taken", whatever the last answer was.
  const slugStatus = effectiveSlug.length < 3 ? "idle" : slugState;
  const category = categories.find((item) => item.id === categoryId) ?? null;
  const index = PHASES.indexOf(phase);
  const nameValid = name.trim().length >= 2;

  // Live availability check, debounced. Pointless once the row exists.
  useEffect(() => {
    if (created || effectiveSlug.length < 3) return;

    const token = ++checkRef.current;
    const timer = setTimeout(async () => {
      const { available } = await checkSlugAvailability(effectiveSlug);
      if (checkRef.current === token) setSlugState(available ? "free" : "taken");
    }, 400);

    return () => clearTimeout(timer);
  }, [effectiveSlug, created]);

  // A pick that auto-advances leaves a timer behind if the person goes back
  // first; it must not fire into a phase they have since left.
  useEffect(() => () => clearTimeout(advanceRef.current ?? undefined), []);

  function goTo(target: Phase) {
    clearTimeout(advanceRef.current ?? undefined);
    setDirection(PHASES.indexOf(target) >= index ? 1 : -1);
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

  /** Writes the profile row. From here on the link is reserved. */
  function createAndContinue() {
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
        setCreated(true);
        goTo("photo");
      } else {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        if (fieldErrors.display_name) goTo("name");
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  /** Saves one screen and moves on. `null` patch = nothing to save. */
  function saveAndGo(patch: Record<string, unknown> | null, target: Phase) {
    if (!patch) {
      goTo(target);
      return;
    }

    startTransition(async () => {
      const result = await updateOnboardingProfile(patch);
      if (result.ok) {
        setErrors({});
        goTo(target);
      } else {
        setErrors(result.fieldErrors ?? {});
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  /** What the current screen has to write, or null when it has nothing. */
  function patchFor(current: Phase): Record<string, unknown> | null {
    switch (current) {
      case "photo":
        return avatar ? { avatar_url: avatar } : null;
      case "bio":
        return bio.trim() ? { bio: bio.trim() } : null;
      case "contact": {
        const patch: Record<string, unknown> = {};
        if (phone.trim()) patch.phone_number = phone.trim();
        if (whatsapp.trim()) patch.whatsapp_number = whatsapp.trim();
        if (location.trim()) patch.location = location.trim();
        return Object.keys(patch).length > 0 ? patch : null;
      }
      case "socials": {
        const filled = Object.fromEntries(
          SOCIALS.map((key) => [key, socials[key]?.trim() || null]).filter(([, value]) => value),
        );
        return Object.keys(filled).length > 0 ? { social_links: filled } : null;
      }
      default:
        return null;
    }
  }

  const next = PHASES[index + 1];
  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-7">
      <OnboardingSteps current={2} advance={(index + 1) / PHASES.length} />

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
              {errorFor("display_name") ? (
                <p className="text-danger text-[13px]">{errorFor("display_name")}</p>
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
                      createAndContinue();
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

        {phase === "photo" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              eyebrow={name.trim() || undefined}
              title={t("phases.photo.title")}
              hint={t("phases.photo.hint")}
            />
            <PhaseField className="py-8">
              <AvatarUpload
                value={avatar}
                onChange={setAvatar}
                name={name.trim() || "?"}
                size="lg"
              />
            </PhaseField>
          </div>
        ) : null}

        {phase === "bio" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              title={t("phases.bio.title")}
              hint={t("phases.bio.hint")}
            />
            <PhaseField>
              <Field label={t("phases.bio.label")} error={errorFor("bio")} optional>
                <Textarea
                  rows={6}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder={
                    category
                      ? t("bioPlaceholderCategory", {
                          category: localized(category.name, locale, category.slug),
                        })
                      : t("bioPlaceholder")
                  }
                  maxLength={1200}
                  autoFocus
                />
              </Field>
            </PhaseField>
          </div>
        ) : null}

        {phase === "contact" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              title={t("phases.contact.title")}
              hint={t("phases.contact.hint")}
            />
            <div className="space-y-3">
              <PhaseField index={0}>
                <Field label={t("phases.contact.phone")} error={errorFor("phone_number")} optional>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+212 6 12 34 56 78"
                    autoFocus
                  />
                </Field>
              </PhaseField>
              <PhaseField index={1}>
                <Field
                  label={t("phases.contact.whatsapp")}
                  hint={t("phases.contact.whatsappHint")}
                  error={errorFor("whatsapp_number")}
                  optional
                >
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    placeholder="+212 6 12 34 56 78"
                  />
                </Field>
              </PhaseField>
              <PhaseField index={2}>
                <Field
                  label={t("phases.contact.location")}
                  hint={t("phases.contact.locationHint")}
                  optional
                >
                  <Input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder={t("phases.contact.locationPlaceholder")}
                    maxLength={120}
                  />
                </Field>
              </PhaseField>
            </div>
          </div>
        ) : null}

        {phase === "socials" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              title={t("phases.socials.title")}
              hint={t("phases.socials.hint")}
            />
            <PhaseField>
              <div className="space-y-3">
                {SOCIALS.map((key) => (
                  <div
                    key={key}
                    className="border-line-strong bg-surface focus-within:border-ink flex h-12 items-center gap-2.5 rounded-[var(--radius-sm)] border pl-3.5 transition-colors"
                  >
                    <SocialIcon name={key} className="text-ink-subtle size-4 shrink-0" />
                    <input
                      value={socials[key] ?? ""}
                      onChange={(event) =>
                        setSocials((current) => ({ ...current, [key]: event.target.value }))
                      }
                      placeholder={t(`phases.socials.${key}` as "phases.socials.instagram")}
                      aria-label={t(`phases.socials.${key}` as "phases.socials.instagram")}
                      className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent pr-3.5 text-[15px] focus:outline-none"
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                  </div>
                ))}
              </div>
            </PhaseField>
          </div>
        ) : null}

        {phase === "ready" ? <ReadyScreen ref={headingRef} name={name.trim()} /> : null}
      </PhaseSwitch>

      {/* ---------------------------------------------------------------- */}

      <div className="flex items-center justify-between gap-3 pt-1">
        {index > 0 && !(existing && index === PHASES.indexOf("photo")) ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => goTo(PHASES[index - 1])}
          >
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
        ) : phase === "link" ? (
          <Button
            type="button"
            size="lg"
            loading={pending}
            disabled={slugStatus === "taken" || effectiveSlug.length < 3}
            onClick={createAndContinue}
          >
            {t("submit")}
            <ArrowRight className="size-4" />
          </Button>
        ) : phase === "ready" ? (
          <Button type="button" size="lg" onClick={() => router.push("/onboarding/offer")}>
            {t("phases.ready.cta")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          // Everything between the link and the offer is optional, so every
          // one of those screens offers both doors.
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => goTo(next)}>
              {tCommon("skip")}
            </Button>
            <Button
              type="button"
              size="lg"
              loading={pending}
              onClick={() => saveAndGo(patchFor(phase), next)}
            >
              {tCommon("continue")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {index > LAST_REQUIRED && phase !== "ready" ? (
        <p className="text-ink-subtle text-center text-[12.5px]">{t("optionalNote")}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The bridge between the two halves of onboarding.
 *
 * It reuses the drawing the empty offer list already uses — a page with room
 * for cards that are not there yet — because that is exactly what the next
 * screen is about to fill. The arrow leans towards the button below it; the
 * lean is a CSS loop, so the browser drops it for readers who asked for less
 * movement without anything here having to ask them.
 */
function ReadyScreen({
  name,
  ref,
}: {
  name: string;
  ref?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations("onboarding.profile");

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <PhaseQuestion
        ref={ref}
        level={1}
        eyebrow={name || undefined}
        title={t("phases.ready.title")}
        hint={t("phases.ready.hint")}
        className="items-center [&>*]:mx-auto"
      />

      <NoOffersArt className="w-full max-w-[220px]" />

      <ArrowDown
        aria-hidden
        className="nudge-down text-ink-subtle size-5"
        style={{ "--nudge-delay": "0.3s" } as CSSProperties}
      />
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
