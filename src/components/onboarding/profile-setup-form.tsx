"use client";

import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { checkSlugAvailability, createProfile } from "@/actions/profile";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, PrefixedInput } from "@/components/ui/field";
import { localized, parseCategoryConfig } from "@/lib/offers/schema";
import { cn, slugify } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  slug: string;
  name: unknown;
  icon: string | null;
  config: unknown;
};

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
  const tError = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  // A slug too short to be valid is never "taken", whatever the last answer was.
  const slugStatus = effectiveSlug.length < 3 ? "idle" : slugState;

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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.display_name = "too_short";
    if (effectiveSlug.length < 3) nextErrors.slug = "invalid_slug";
    if (slugStatus === "taken") nextErrors.slug = "slug_taken";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
        setErrors(result.fieldErrors ?? {});
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <div>
        <h2 className="text-ink text-[15px] font-semibold">{t("categoryTitle")}</h2>
        <p className="text-ink-muted mt-0.5 text-[13px]">{t("categoryHint")}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((category) => {
            const selected = categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-left transition-all duration-200",
                  selected
                    ? "border-ink bg-ink/[0.03] shadow-[0_0_0_1px_var(--color-ink)]"
                    : "border-line-strong hover:border-ink/30 hover:bg-canvas",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-ink text-ink-inverse" : "bg-ink/5 text-ink-muted",
                  )}
                >
                  <CategoryIcon name={category.icon} className="size-4" />
                </span>
                <span className="text-ink text-[13px] leading-tight font-medium">
                  {localized(category.name, locale, category.slug)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        <Field
          label={t("nameLabel")}
          hint={t("nameHint")}
          error={errors.display_name ? tError(errors.display_name as "too_short") : null}
        >
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlugState("checking");
            }}
            placeholder={t("namePlaceholder")}
            maxLength={80}
            autoFocus
          />
        </Field>

        <Field
          label={t("slugLabel")}
          error={errors.slug ? tError(errors.slug as "slug_taken") : null}
          hint={
            slugStatus === "taken"
              ? tError("slug_taken")
              : slugStatus === "free"
                ? t("slugFree")
                : t("slugHint")
          }
        >
          <div className="relative">
            <PrefixedInput
              prefix={`${linkBase}/`}
              value={effectiveSlug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlugState("checking");
                setSlug(slugify(event.target.value));
              }}
              placeholder="your-name"
              spellCheck={false}
              autoCapitalize="none"
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
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} disabled={slugStatus === "taken"}>
          {t("submit")}
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {categoryId ? <CategoryPreview categories={categories} categoryId={categoryId} /> : null}
    </form>
  );
}

/** Shows what the next step will pre-fill, so the choice feels consequential. */
function CategoryPreview({
  categories,
  categoryId,
}: {
  categories: CategoryOption[];
  categoryId: string;
}) {
  const t = useTranslations("onboarding.profile");
  const locale = useLocale();
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;

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
