"use client";

import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { checkSlugAvailability, updateProfile } from "@/actions/profile";
import { SocialIcon } from "@/components/brand/social-icons";
import { AvatarUpload } from "@/components/media/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ToggleRow } from "@/components/ui/primitives";
import { Field, Input, NativeSelect, PrefixedInput, Textarea } from "@/components/ui/field";
import { localized } from "@/lib/offers/schema";
import type { Tables } from "@/lib/supabase/database.types";
import { cn, slugify } from "@/lib/utils";
import { SOCIAL_KEYS, THEME_ACCENTS, type SocialKey, type ThemeAccent } from "@/lib/validation";

type Category = Pick<Tables<"activity_categories">, "id" | "slug" | "name" | "icon">;

export function ProfileEditor({
  profile,
  categories,
  linkBase,
  publicUrl,
}: {
  profile: Tables<"profiles">;
  categories: Category[];
  linkBase: string;
  publicUrl: string;
}) {
  const t = useTranslations("dashboard.profile");
  const tError = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const initialSocial = (profile.social_links ?? {}) as Partial<Record<SocialKey, string | null>>;
  const initialTheme = (profile.theme ?? {}) as { accent?: ThemeAccent };

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [slug, setSlug] = useState(profile.slug);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);
  const [categoryId, setCategoryId] = useState<string | null>(profile.category_id);
  const [social, setSocial] = useState<Partial<Record<SocialKey, string>>>(
    Object.fromEntries(SOCIAL_KEYS.map((key) => [key, initialSocial[key] ?? ""])) as Partial<
      Record<SocialKey, string>
    >,
  );
  const [accent, setAccent] = useState<ThemeAccent>(initialTheme.accent ?? "coral");
  const [calendarVisible, setCalendarVisible] = useState(profile.calendar_visible);
  const [closedMessage, setClosedMessage] = useState(profile.custom_closed_message ?? "");

  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const checkRef = useRef(0);

  const slugStatus = slug === profile.slug || slug.length < 3 ? "idle" : slugState;

  useEffect(() => {
    if (slug === profile.slug || slug.length < 3) return;

    const token = ++checkRef.current;
    const timer = setTimeout(async () => {
      const { available } = await checkSlugAvailability(slug);
      if (checkRef.current === token) setSlugState(available ? "free" : "taken");
    }, 400);

    return () => clearTimeout(timer);
  }, [slug, profile.slug]);

  function save() {
    startTransition(async () => {
      const result = await updateProfile({
        display_name: displayName.trim(),
        slug,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatar,
        category_id: categoryId,
        social_links: Object.fromEntries(
          SOCIAL_KEYS.map((key) => [key, social[key]?.trim() || null]),
        ),
        theme: { accent },
        calendar_visible: calendarVisible,
        custom_closed_message: closedMessage.trim() || null,
      });

      if (result.ok) {
        setErrors({});
        toast.success(tCommon("saved"));
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  return (
    <div data-accent={accent} className="space-y-6 pb-20">
      <Card className="p-5 sm:p-7">
        <CardHeader title={t("identityTitle")} description={t("identityHint")} />

        <div className="mt-6 space-y-5">
          <AvatarUpload value={avatar} onChange={setAvatar} name={displayName} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} error={errorFor("display_name")}>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
              />
            </Field>

            <Field label={t("category")}>
              <NativeSelect
                value={categoryId ?? ""}
                onChange={(event) => setCategoryId(event.target.value || null)}
              >
                <option value="">{t("noCategory")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {localized(category.name, locale, category.slug)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field label={t("headline")} hint={t("headlineHint")} optional>
            <Input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder={t("headlinePlaceholder")}
              maxLength={120}
            />
          </Field>

          <Field label={t("bio")} hint={t("bioHint")} optional>
            <Textarea
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder={t("bioPlaceholder")}
              maxLength={1200}
            />
          </Field>

          <Field label={t("location")} optional>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t("locationPlaceholder")}
              maxLength={120}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader
          title={t("linkTitle")}
          description={t("linkHint")}
          action={
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ink inline-flex items-center gap-1.5 text-[13px] font-medium underline underline-offset-4"
            >
              {tCommon("viewPage")}
              <ExternalLink className="size-3.5" />
            </a>
          }
        />

        <div className="mt-5">
          <Field
            label={t("slug")}
            error={errorFor("slug")}
            hint={slugStatus === "free" ? t("slugFree") : t("slugWarning")}
          >
            <div className="relative">
              <PrefixedInput
                prefix={`${linkBase}/`}
                value={slug}
                onChange={(event) => {
                  setSlugState("checking");
                  setSlug(slugify(event.target.value));
                }}
                spellCheck={false}
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
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("socialTitle")} description={t("socialHint")} />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <div
              key={key}
              className="border-line-strong bg-surface focus-within:border-ink flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border pl-3 transition-colors"
            >
              <SocialIcon name={key} className="text-ink-subtle size-4 shrink-0" />
              <input
                value={social[key] ?? ""}
                onChange={(event) =>
                  setSocial((current) => ({ ...current, [key]: event.target.value }))
                }
                placeholder={t(`socialPlaceholder.${key}` as "socialPlaceholder.instagram")}
                className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent pr-3 text-[14px] focus:outline-none"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("appearanceTitle")} description={t("appearanceHint")} />

        <div className="mt-5 flex flex-wrap gap-2">
          {THEME_ACCENTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAccent(option)}
              data-accent={option}
              aria-pressed={accent === option}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-medium transition-all",
                accent === option
                  ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]"
                  : "border-line-strong hover:border-ink/30",
              )}
            >
              <span className="size-3.5 rounded-full bg-[var(--accent)]" />
              {t(`accents.${option}` as "accents.coral")}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("visibilityTitle")} description={t("visibilityHint")} />

        <div className="divide-line mt-2 divide-y">
          <ToggleRow
            title={t("calendarVisible")}
            description={t("calendarVisibleHint")}
            checked={calendarVisible}
            onCheckedChange={setCalendarVisible}
          />
        </div>

        {!calendarVisible ? (
          <div className="mt-4">
            <Field label={t("closedMessage")} hint={t("closedMessageHint")}>
              <Textarea
                rows={3}
                value={closedMessage}
                onChange={(event) => setClosedMessage(event.target.value)}
                placeholder={t("closedMessagePlaceholder")}
                maxLength={500}
              />
            </Field>
          </div>
        ) : null}
      </Card>

      <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-6">
        <Button onClick={save} loading={pending} size="lg" className="shadow-[var(--shadow-float)]">
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
