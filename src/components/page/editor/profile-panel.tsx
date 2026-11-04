"use client";

import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { updateSlug } from "@/actions/page";
import { checkSlugAvailability } from "@/actions/profile";
import { AvatarUpload } from "@/components/media/image-upload";
import { CustomFieldsEditor } from "@/components/offers/custom-fields-editor";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, PrefixedInput, Textarea } from "@/components/ui/field";
import { notify } from "@/lib/notify";
import type { OfferField } from "@/lib/offers/fields";
import { localized } from "@/lib/offers/schema";
import { PROFILE_FIELD_SUGGESTIONS, PROFILE_FIELD_TYPES } from "@/lib/profile/details";
import { cn, slugify } from "@/lib/utils";

export type HeaderDraft = {
  display_name: string;
  headline: string;
  bio: string;
  location: string;
  avatar_url: string | null;
  category_id: string | null;
  custom_fields: OfferField[];
};

export type CategoryOption = { id: string; slug: string; name: unknown };

/**
 * The top of the page: photo, name, a line under it, a short bio. Saved as
 * typed, like the blocks. The link, the activity and the details are one
 * fold down — set once, rarely touched again.
 */
export function ProfilePanel({
  draft,
  onChange,
  errors,
  categories,
  locale,
  slug: currentSlug,
  linkBase,
  onSlugChanged,
}: {
  draft: HeaderDraft;
  onChange: (draft: HeaderDraft) => void;
  errors: Record<string, string>;
  categories: CategoryOption[];
  locale: string;
  slug: string;
  linkBase: string;
  onSlugChanged: (slug: string) => void;
}) {
  const t = useTranslations("page.profile");
  const tError = useTranslations("errors");
  const [more, setMore] = useState(false);
  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);
  const set = <K extends keyof HeaderDraft>(key: K, value: HeaderDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-5">
      <AvatarUpload
        value={draft.avatar_url}
        onChange={(url) => set("avatar_url", url)}
        name={draft.display_name}
      />

      <Field label={t("name")} error={errorFor("display_name")}>
        <Input
          value={draft.display_name}
          maxLength={80}
          onChange={(event) => set("display_name", event.target.value)}
        />
      </Field>

      <Field label={t("headline")} hint={t("headlineHint")} optional>
        <Input
          value={draft.headline}
          maxLength={120}
          placeholder={t("headlinePlaceholder")}
          onChange={(event) => set("headline", event.target.value)}
        />
      </Field>

      <Field label={t("bio")} optional>
        <Textarea
          rows={4}
          value={draft.bio}
          maxLength={1200}
          placeholder={t("bioPlaceholder")}
          onChange={(event) => set("bio", event.target.value)}
        />
      </Field>

      <Field label={t("location")} optional>
        <Input
          value={draft.location}
          maxLength={120}
          placeholder={t("locationPlaceholder")}
          onChange={(event) => set("location", event.target.value)}
        />
      </Field>

      <div className="border-line rounded-[var(--radius-md)] border">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span>
            <span className="text-ink block text-[14px] font-medium">{t("more")}</span>
            <span className="text-ink-muted block text-[12.5px]">{t("moreHint")}</span>
          </span>
          <ChevronDown
            className={cn(
              "text-ink-subtle size-4 transition-transform duration-300",
              more && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {more ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-line space-y-6 border-t px-4 pt-4 pb-5">
                <SlugField current={currentSlug} linkBase={linkBase} onChanged={onSlugChanged} />

                <Field label={t("category")} hint={t("categoryHint")}>
                  <NativeSelect
                    value={draft.category_id ?? ""}
                    onChange={(event) => set("category_id", event.target.value || null)}
                  >
                    <option value="">{t("noCategory")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {localized(category.name, locale, category.slug)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>

                <div>
                  <p className="text-ink text-[13px] font-medium">{t("details")}</p>
                  <p className="text-ink-muted mb-3 text-[13px]">{t("detailsHint")}</p>
                  <CustomFieldsEditor
                    fields={draft.custom_fields}
                    onChange={(fields) => set("custom_fields", fields)}
                    suggestions={PROFILE_FIELD_SUGGESTIONS}
                    allowedTypes={PROFILE_FIELD_TYPES}
                    locale={locale}
                    errors={errors}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The link is saved on purpose, not as typed: changing it breaks every copy already shared. */
function SlugField({
  current,
  linkBase,
  onChanged,
}: {
  current: string;
  linkBase: string;
  onChanged: (slug: string) => void;
}) {
  const t = useTranslations("page.profile");
  const tError = useTranslations("errors");
  const [slug, setSlug] = useState(current);
  const [state, setState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);
  const changed = slug !== current && slug.length >= 3;

  useEffect(() => {
    if (!changed) return;
    const token = ++checkRef.current;
    const timer = setTimeout(async () => {
      const { available } = await checkSlugAvailability(slug);
      if (checkRef.current === token) setState(available ? "free" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, changed]);

  return (
    <Field
      label={t("slug")}
      error={
        error
          ? tError(error as "unexpected")
          : state === "taken" && changed
            ? tError("slug_taken")
            : null
      }
      hint={changed ? t("slugWarning") : null}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <PrefixedInput
            prefix={`${linkBase}/`}
            value={slug}
            spellCheck={false}
            onChange={(event) => {
              setError(null);
              setState("checking");
              setSlug(slugify(event.target.value));
            }}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
            {changed && state === "checking" ? (
              <Loader2 className="text-ink-subtle size-4 animate-spin" aria-hidden />
            ) : changed && state === "free" ? (
              <Check className="text-success size-4" aria-hidden />
            ) : changed && state === "taken" ? (
              <X className="text-danger size-4" aria-hidden />
            ) : null}
          </span>
        </div>
        {changed ? (
          <Button
            type="button"
            size="md"
            loading={pending}
            disabled={state !== "free"}
            onClick={() =>
              startTransition(async () => {
                const result = await updateSlug(slug);
                if (result.ok && result.data) {
                  onChanged(result.data.slug);
                  notify.success(t("slugSaved"));
                } else if (!result.ok) {
                  setError(result.fieldErrors?.slug ?? result.error);
                }
              })
            }
          >
            {t("slugSave")}
          </Button>
        ) : null}
      </div>
    </Field>
  );
}
