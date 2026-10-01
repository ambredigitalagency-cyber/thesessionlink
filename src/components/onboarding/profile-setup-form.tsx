"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { checkSlugAvailability, createProfile, updateOnboardingProfile } from "@/actions/profile";
import { SocialIcon } from "@/components/brand/social-icons";
import { CategoryIcon } from "@/components/categories/category-icon";
import { AvatarUpload } from "@/components/media/image-upload";
import { CustomFieldsEditor } from "@/components/offers/custom-fields-editor";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-cards";
import { Field, Input, PrefixedInput, Textarea } from "@/components/ui/field";
import { PhaseField, PhaseQuestion, PhaseSwitch } from "@/components/ui/phase";
import { notify } from "@/lib/notify";
import type { OfferField } from "@/lib/offers/fields";
import { localized, parseCategoryConfig } from "@/lib/offers/schema";
import { PROFILE_FIELD_SUGGESTIONS, PROFILE_FIELD_TYPES } from "@/lib/profile/details";
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
 * Now each screen asks one thing, at the moment it starts to matter, and the
 * journey is split around the first offer:
 *
 *   * part 1, "identity" — what you do, under what name, at what address. The
 *     profile row is written the moment the link is settled, so nobody can
 *     take it while the rest is filled in; from then on the link answers with
 *     a "being set up" page. Then straight to the first offer (part 2,
 *     /onboarding/offer), which is what makes the page worth visiting.
 *   * part 3, "finish" — a photo, a few words, how to reach you, where to find
 *     you, details about you (the same editor as Dashboard › Profile). These
 *     dress a page that is already live with its offer, so every one of them
 *     can be skipped, and each saves on its own: closing the tab on the third
 *     screen keeps the two before it. The last one opens the share screen.
 *
 * The finish screens come after the first offer, which already stamped
 * onboarding_completed_at; they save through updateOnboardingProfile, which
 * writes only the keys a screen sends. Someone who leaves halfway finds the
 * dashboard on their next visit, where all of it can be edited anyway.
 */

const PHASES = {
  identity: ["category", "name", "link"],
  finish: ["photo", "bio", "contact", "socials", "details"],
} as const;
type Part = keyof typeof PHASES;
type Phase = (typeof PHASES)[Part][number];

/** Shown on the socials screen, in this order. WhatsApp sits with the phone. */
const SOCIALS: SocialKey[] = ["instagram", "tiktok", "facebook"];

export function ProfileSetupForm({
  part,
  categories,
  linkBase,
  defaultName,
  existing,
  publicUrl,
}: {
  part: Part;
  categories: CategoryOption[];
  linkBase: string;
  defaultName?: string;
  /** The profile row, once written: what the finish screens dress. */
  existing?: { categoryId: string | null; displayName: string; slug: string } | null;
  /** The live page, linked from the first finish screen. */
  publicUrl?: string;
}) {
  const t = useTranslations("onboarding.profile");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const phases: readonly Phase[] = PHASES[part];
  const [phase, setPhase] = useState<Phase>(phases[0]);
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
  const [details, setDetails] = useState<OfferField[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  // A slug too short to be valid is never "taken", whatever the last answer was.
  const slugStatus = effectiveSlug.length < 3 ? "idle" : slugState;
  const category = categories.find((item) => item.id === categoryId) ?? null;
  const index = phases.indexOf(phase);
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
    setDirection(phases.indexOf(target) >= index ? 1 : -1);
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
        // The link is reserved: on to the first offer. `pending` stays on
        // through the navigation, so the button cannot be pressed twice.
        setCreated(true);
        router.push("/onboarding/offer");
      } else {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        if (fieldErrors.display_name) goTo("name");
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  /**
   * Saves one finish screen and moves on. `null` patch = nothing to write; no
   * target = this was the last screen, so the share screen opens.
   */
  function saveAndGo(patch: Record<string, unknown> | null, target: Phase | undefined) {
    if (!patch && target) {
      goTo(target);
      return;
    }

    startTransition(async () => {
      const result = patch ? await updateOnboardingProfile(patch) : { ok: true as const };
      if (result.ok && !target) {
        router.push("/onboarding/share");
      } else if (result.ok && target) {
        setErrors({});
        goTo(target);
      } else if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  /** What a finish screen has to write, or null when it has nothing. */
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
      case "details":
        return details.length > 0 ? { custom_fields: details } : null;
      default:
        return null;
    }
  }

  const next = phases[index + 1];
  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-7">
      {part === "identity" ? (
        <OnboardingSteps current={2} advance={(index + 1) / phases.length} />
      ) : (
        // The share screen is the last fraction of this step.
        <OnboardingSteps current={4} advance={(index + 1) / (phases.length + 1)} />
      )}

      {part === "finish" && index === 0 ? <LiveNotice url={publicUrl} /> : null}

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
        {phase === "details" ? (
          <div className="space-y-6">
            <PhaseQuestion
              ref={headingRef}
              level={1}
              title={t("phases.details.title")}
              hint={t("phases.details.hint")}
            />
            <PhaseField>
              <CustomFieldsEditor
                fields={details}
                onChange={setDetails}
                suggestions={PROFILE_FIELD_SUGGESTIONS}
                allowedTypes={PROFILE_FIELD_TYPES}
                locale={locale}
                errors={errors}
              />
            </PhaseField>
          </div>
        ) : null}
      </PhaseSwitch>

      {/* ---------------------------------------------------------------- */}

      {/* On a phone the doors stack at full width, the way forward on top and
          "back" last: a long label never pushes a button off the screen, and
          both doors are the same size for real. Each part starts on its own
          first screen: there is no going back from the photo to the link,
          which is written, nor to the offer, which is published. */}
      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {index > 0 ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => goTo(phases[index - 1])}
            className="self-start sm:self-auto"
          >
            <ArrowLeft className="size-4" />
            {tCommon("back")}
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}

        {phase === "category" ? (
          // The category only pre-fills suggestions, so it has always been
          // skippable. Losing that to the new flow would be a regression.
          <Button type="button" size="lg" variant="secondary" onClick={() => goTo("name")}>
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
        ) : (
          // Every finish screen is optional, so each offers both doors, at the
          // same size: skipping is a full answer, not a small print escape.
          // The last one opens the share screen.
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={pending}
              onClick={() => saveAndGo(null, next)}
            >
              {tCommon("skip")}
            </Button>
            <Button
              type="button"
              size="lg"
              loading={pending}
              onClick={() => saveAndGo(patchFor(phase), next)}
            >
              {next ? tCommon("continue") : t("finish")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {part === "finish" ? (
        <p className="text-ink-subtle text-center text-[12.5px]">{t("optionalNote")}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Opens the finishing touches: the page is already live, with its offer, and
 * the coach can look at it before dressing it. Same badge as the share screen.
 */
function LiveNotice({ url }: { url?: string }) {
  const t = useTranslations("onboarding.finish");

  return (
    <div className="rise-in space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="bg-success-soft text-success inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
          <span aria-hidden className="bg-success size-1.5 rounded-full" />
          {t("badge")}
        </span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-[13px] underline underline-offset-4 transition-colors"
          >
            {t("viewPage")}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        ) : null}
      </div>
      <p className="text-ink-muted text-[14px] leading-relaxed">{t("intro")}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

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
