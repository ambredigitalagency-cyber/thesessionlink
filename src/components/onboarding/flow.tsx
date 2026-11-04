"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";

import {
  checkSlug,
  chooseCategory,
  chooseTheme,
  createIdentity,
  publishPage,
  type SlugCheck,
} from "@/actions/onboarding";
import { CategoryIcon } from "@/components/categories/category-icon";
import { PRIMARY_GLYPHS } from "@/components/marketing/action-glyphs";
import { ThemePicker } from "@/components/page/editor/appearance-panel";
import { PageView } from "@/components/page/page-view";
import { PhoneFrame } from "@/components/page/phone-frame";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-cards";
import { Field, Input, PrefixedInput } from "@/components/ui/field";
import { PhaseField, PhaseQuestion, PhaseSwitch } from "@/components/ui/phase";
import { notify } from "@/lib/notify";
import { localized } from "@/lib/offers/schema";
import { DEFAULT_COUNTRY, whatsappMessageFor, type CountryCode } from "@/lib/onboarding/config";
import { PRIMARY_KINDS, type PrimaryKind } from "@/lib/onboarding/primary";
import { slugFromName, slugShape, SLUG_MAX } from "@/lib/onboarding/slug";
import { SCREENS, canOpen, type Screen } from "@/lib/onboarding/steps";
import type { PagePreview } from "@/lib/page/preview";
import type { ThemeId } from "@/lib/page/themes";
import { slugify } from "@/lib/utils";

import { PhoneField } from "./phone-field";
import { OnboardingSteps } from "./steps";

export type CategoryOption = { id: string; slug: string; name: unknown; icon: string | null };

/**
 * The sign-up, four screens in one client flow so each answer moves on at
 * once, with the same sideways transition as the offer wizard.
 *
 * Every screen saves on the way out, and the server decides where an account
 * stands (resolveStep): reloading, leaving or coming back another day opens
 * the screen it stopped at. Going back is offered only from the name and link
 * to the trade — past the link, the trade is changed in "Ma page", and the
 * main button, once the page is live, is edited there too.
 */
export function OnboardingFlow({
  initialStep,
  categories,
  initialCategoryId,
  identity,
  linkBase,
  contactEmail,
  initialPreview,
  initialTheme,
  initialSlug = null,
}: {
  initialStep: Screen;
  categories: CategoryOption[];
  initialCategoryId: string | null;
  /** Once the profile exists. */
  identity: { displayName: string; slug: string } | null;
  linkBase: string;
  contactEmail: string | null;
  /** Once the page is live. */
  initialPreview: PagePreview | null;
  initialTheme: ThemeId;
  /** The link chosen on the landing ("Choose your link"), carried through sign-in. */
  initialSlug?: string | null;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(initialStep);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [displayName, setDisplayName] = useState(identity?.displayName ?? "");
  const [preview, setPreview] = useState(initialPreview);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const category = categories.find((item) => item.id === categoryId) ?? null;

  function goTo(next: Screen) {
    setDirection(SCREENS.indexOf(next) >= SCREENS.indexOf(screen) ? 1 : -1);
    setScreen(next);
    // Focus travels with the question, so the flow can be followed without eyes.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
  }

  return (
    <div className="space-y-8">
      <OnboardingSteps current={screen} />

      <PhaseSwitch phase={screen} direction={direction}>
        {screen === "category" ? (
          <CategoryScreen
            headingRef={headingRef}
            categories={categories}
            value={categoryId}
            onDone={(id) => {
              setCategoryId(id);
              goTo("identity");
            }}
          />
        ) : screen === "identity" ? (
          <IdentityScreen
            headingRef={headingRef}
            category={category}
            linkBase={linkBase}
            initialName={displayName}
            initialSlug={initialSlug}
            onBack={canOpen("category", "identity") ? () => goTo("category") : undefined}
            onDone={(name) => {
              setDisplayName(name);
              goTo("button");
            }}
          />
        ) : screen === "button" ? (
          <ButtonScreen
            headingRef={headingRef}
            categorySlug={category?.slug ?? null}
            contactEmail={contactEmail}
            onDone={(next) => {
              setPreview(next);
              goTo("appearance");
            }}
          />
        ) : preview ? (
          <AppearanceScreen
            headingRef={headingRef}
            preview={preview}
            initialTheme={initialTheme}
            onDone={() => router.push("/onboarding/done")}
          />
        ) : null}
      </PhaseSwitch>
    </div>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

/* -------------------------------------------------------------------------- */
/* The way forward — constant height, as wide as its words                     */
/* -------------------------------------------------------------------------- */

function Footer({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      {onBack ? (
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Button>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}

/** The coral tile of the block library, around a trade's pictogram. */
function TradeTile({ icon }: { icon: string | null }) {
  return (
    <span aria-hidden className="relative inline-flex size-12 shrink-0">
      <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-[12px] bg-[color-mix(in_oklab,var(--color-brand)_14%,transparent)]" />
      <span className="relative flex size-full items-center justify-center rounded-[12px] border border-[color-mix(in_oklab,var(--color-brand)_28%,transparent)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <CategoryIcon name={icon} className="size-5" />
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. The trade                                                                */
/* -------------------------------------------------------------------------- */

function CategoryScreen({
  headingRef,
  categories,
  value,
  onDone,
}: {
  headingRef: HeadingRef;
  categories: CategoryOption[];
  value: string | null;
  onDone: (id: string) => void;
}) {
  const t = useTranslations("onboarding.category");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const [picked, setPicked] = useState(value);
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    if (pending) return;
    setPicked(id);
    startTransition(async () => {
      // The tick lands before the screen moves on: the choice is seen.
      const [result] = await Promise.all([
        chooseCategory(id),
        new Promise((resolve) => setTimeout(resolve, 280)),
      ]);
      if (result.ok) onDone(id);
      else {
        setPicked(value);
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <PhaseQuestion ref={headingRef} level={1} title={t("title")} hint={t("hint")} />
      <ChoiceGroup
        name="category"
        label={t("title")}
        layout="tile"
        columns={3}
        visual="bare"
        value={picked}
        onChange={pick}
        options={categories.map((item) => ({
          value: item.id,
          title: localized(item.name, locale, item.slug),
          visual: <TradeTile icon={item.icon} />,
        }))}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. The name and the link                                                    */
/* -------------------------------------------------------------------------- */

type SlugState = SlugCheck["status"] | "checking" | "idle";

function IdentityScreen({
  headingRef,
  category,
  linkBase,
  initialName,
  initialSlug,
  onBack,
  onDone,
}: {
  headingRef: HeadingRef;
  category: CategoryOption | null;
  linkBase: string;
  initialName: string;
  initialSlug: string | null;
  onBack?: () => void;
  onDone: (name: string) => void;
}) {
  const t = useTranslations("onboarding.identity");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const [name, setName] = useState(initialName);
  const [typedSlug, setTypedSlug] = useState<string | null>(initialSlug);
  // The server's last answer, kept with the link it was about: the status
  // shown is derived from it only while that link is still the one typed.
  const [answer, setAnswer] = useState<(SlugCheck & { slug: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // The link follows the name until the coach types one of their own.
  const slug = typedSlug ?? slugFromName(name);
  const nameValid = name.trim().length >= 2;
  const shape = slug ? slugShape(slug) : null;
  const current = answer?.slug === slug ? answer : null;
  const state: SlugState =
    errors.slug === "slug_taken"
      ? "taken"
      : !shape
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
    // Malformed is known here; everything else, reserved words included
    // (for their free alternatives), is asked of the server.
    if (!slug || slugShape(slug) === "invalid") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSlug(slug, category?.slug ?? null);
      if (!cancelled) setAnswer({ ...result, slug });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, category?.slug]);

  const canSubmit = nameValid && state === "free" && !pending;

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await createIdentity({
        display_name: name.trim(),
        slug,
        locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (result.ok) {
        onDone(name.trim());
      } else {
        setErrors(result.fieldErrors ?? {});
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  const statusTone =
    state === "free"
      ? "text-success"
      : state === "taken" || state === "reserved" || state === "invalid"
        ? "text-danger"
        : "text-ink-muted";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <PhaseQuestion
        ref={headingRef}
        level={1}
        eyebrow={category ? localized(category.name, locale, category.slug) : undefined}
        title={t("title")}
        hint={t("hint")}
      />

      <PhaseField index={0} className="space-y-5">
        <Field
          label={t("nameLabel")}
          hint={t("nameHint")}
          error={errors.display_name ? tError(errors.display_name as "unexpected") : null}
        >
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors({});
            }}
            placeholder={t("namePlaceholder")}
            maxLength={80}
            autoComplete="name"
            autoFocus
            className="h-12 text-[17px]"
          />
        </Field>

        <Field label={t("slugLabel")}>
          <div className="relative">
            <PrefixedInput
              prefix={`${linkBase}/`}
              value={slug}
              onChange={(event) => {
                setTypedSlug(slugify(event.target.value).slice(0, SLUG_MAX));
                setErrors({});
              }}
              placeholder={slugFromName(t("namePlaceholder").split(",")[0]) || "sara"}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              aria-describedby="slug-status"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
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
          <p id="slug-status" aria-live="polite" className={`min-h-5 text-[13px] ${statusTone}`}>
            {state === "idle" ? "" : t(`status.${state}`)}
          </p>

          <AnimatePresence initial={false}>
            {suggestions.length > 0 && (state === "taken" || state === "reserved") ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <p className="text-ink-muted pt-1 text-[12.5px]">{t("suggestions")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTypedSlug(suggestion)}
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
        </Field>
      </PhaseField>

      <Footer onBack={onBack}>
        <Button type="submit" size="lg" loading={pending} disabled={!canSubmit}>
          {t("submit")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </Footer>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. The main button                                                          */
/* -------------------------------------------------------------------------- */

function ButtonScreen({
  headingRef,
  categorySlug,
  contactEmail,
  onDone,
}: {
  headingRef: HeadingRef;
  categorySlug: string | null;
  contactEmail: string | null;
  onDone: (preview: PagePreview) => void;
}) {
  const t = useTranslations("onboarding.button");
  const tError = useTranslations("errors");
  const locale = useLocale();
  const [kind, setKind] = useState<PrimaryKind | null>(null);
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState(() => whatsappMessageFor(categorySlug, locale));
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const ready =
    kind === "message" ||
    ((kind === "whatsapp" || kind === "call") && number.trim().length >= 6) ||
    (kind === "link" && url.trim().length > 3 && label.trim().length > 0);

  function submit() {
    if (!kind || !ready || pending) return;
    const input =
      kind === "whatsapp"
        ? { kind, country, number, message }
        : kind === "call"
          ? { kind, country, number }
          : kind === "link"
            ? { kind, url, label }
            : { kind };

    startTransition(async () => {
      const result = await publishPage(input);
      if (result.ok && result.data) {
        onDone(result.data);
      } else if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <PhaseQuestion ref={headingRef} level={1} title={t("title")} hint={t("hint")} />

      <ChoiceGroup
        name="primary"
        label={t("groupLabel")}
        layout="tile"
        columns={2}
        visual="bare"
        className="grid-cols-2"
        value={kind}
        onChange={(next) => {
          setKind(next);
          setErrors({});
        }}
        options={PRIMARY_KINDS.map((option) => {
          const Glyph = PRIMARY_GLYPHS[option];
          return {
            value: option,
            title: t(`kinds.${option}.title`),
            description: t(`kinds.${option}.description`),
            visual: <Glyph className="w-full max-w-[120px]" />,
          };
        })}
      />

      <AnimatePresence mode="wait" initial={false}>
        {kind ? (
          <motion.div
            key={kind}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {kind === "whatsapp" || kind === "call" ? (
              <div className="border-line bg-surface space-y-5 rounded-[var(--radius-md)] border p-4 sm:p-5">
                <PhoneField
                  country={country}
                  onCountryChange={setCountry}
                  number={number}
                  onNumberChange={(value) => {
                    setNumber(value);
                    setErrors({});
                  }}
                  label={kind === "whatsapp" ? t("whatsappNumber") : t("callNumber")}
                  countryLabel={t("country")}
                  hint={t("numberHint")}
                  error={errorFor("number")}
                  placeholder={t("numberPlaceholder")}
                  autoFocus
                />
                {kind === "whatsapp" ? (
                  <Field
                    label={t("messageLabel")}
                    hint={t("messageHint")}
                    error={errorFor("message")}
                  >
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={300}
                      rows={3}
                      className="border-line-strong bg-surface text-ink focus:border-ink placeholder:text-ink-subtle w-full resize-none rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[15px] leading-relaxed transition-colors focus:outline-none"
                    />
                  </Field>
                ) : null}
              </div>
            ) : kind === "link" ? (
              <div className="border-line bg-surface space-y-5 rounded-[var(--radius-md)] border p-4 sm:p-5">
                <Field label={t("url")} error={errorFor("url")}>
                  <Input
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setErrors({});
                    }}
                    placeholder={t("urlPlaceholder")}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoFocus
                    maxLength={2000}
                  />
                </Field>
                <Field label={t("label")} error={errorFor("label")}>
                  <Input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t("labelPlaceholder")}
                    maxLength={80}
                  />
                </Field>
              </div>
            ) : (
              <p className="bg-ink/[0.035] text-ink-muted rounded-[var(--radius-md)] p-4 text-[14px] leading-relaxed">
                {t("messageNote", { email: contactEmail ?? "" })}
              </p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Footer>
        <Button type="submit" size="lg" loading={pending} disabled={!ready}>
          {t("submit")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </Footer>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. The look                                                                 */
/* -------------------------------------------------------------------------- */

function AppearanceScreen({
  headingRef,
  preview,
  initialTheme,
  onDone,
}: {
  headingRef: HeadingRef;
  preview: PagePreview;
  initialTheme: ThemeId;
  onDone: () => void;
}) {
  const t = useTranslations("onboarding.appearance");
  const tError = useTranslations("errors");
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await chooseTheme(theme);
      if (result.ok) onDone();
      else notify.error(tError(result.error as "unexpected"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <span className="bg-success-soft text-success inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
          <span aria-hidden className="bg-success size-1.5 rounded-full" />
          {t("live")}
        </span>
        <PhaseQuestion ref={headingRef} level={1} title={t("title")} hint={t("hint")} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <ThemePicker
          name="onboarding"
          label={t("title")}
          theme={theme}
          accent={preview.accent}
          onSelect={setTheme}
          className="sm:grid-cols-2 lg:grid-cols-2"
        />
        <figure className="order-first md:sticky md:top-6 md:order-none">
          <PhoneFrame
            className="max-w-[260px]"
            screenClassName="h-[400px] md:h-[480px] rounded-[1.5rem]"
            scale={0.6}
          >
            <PageView
              preview
              profile={preview.profile}
              blocks={preview.blocks}
              offers={preview.offers}
              theme={theme}
              accent={preview.accent}
            />
          </PhoneFrame>
          <figcaption className="text-ink-subtle mt-2 text-center text-[12px]">
            {t("preview")}
          </figcaption>
        </figure>
      </div>

      <Footer>
        <Button type="button" size="lg" loading={pending} onClick={submit}>
          {t("submit")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </Footer>
    </div>
  );
}
