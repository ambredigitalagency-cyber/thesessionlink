"use client";

import { ExternalLink, FileText, Loader2, Plus, Star, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";

import { GalleryUpload } from "@/components/media/image-upload";
import { PlatformIcon, PLATFORM_NAMES } from "@/components/page/platform-icon";
import { ChoiceChips } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toggle } from "@/components/ui/primitives";
import { UploadError, uploadPdf } from "@/lib/media/upload";
import type { BlockType } from "@/lib/page/blocks";
import { WEEK_ORDER, type DayHours } from "@/lib/page/hours";
import { detectPlatform, linkLabel, youtubeId, youtubeThumbnail } from "@/lib/page/urls";
import { cn } from "@/lib/utils";

type Config = Record<string, unknown>;
type Item = Record<string, unknown>;

export type FormProps = {
  type: BlockType;
  config: Config;
  onChange: (config: Config) => void;
  /** Field errors, already limited to the fields the coach has left. */
  errorFor: (path: string) => string | null;
  /** Marks a field as left, so its error may show. */
  touch: (path: string) => void;
  offerTitle?: string | null;
  offerId?: string | null;
  locale: string;
};

const str = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown) => (Array.isArray(value) ? (value as Item[]) : []);

/** The fields of one block. Minimal on purpose: everything else has a default. */
export function BlockForm(props: FormProps) {
  switch (props.type) {
    case "link":
      return <LinkForm {...props} />;
    case "socials":
      return <SocialsForm {...props} />;
    case "whatsapp":
      return (
        <div className="space-y-4">
          <TextInput
            {...props}
            path="number"
            label="phone"
            inputType="tel"
            placeholder="+33 6 12 34 56 78"
          />
          <TextArea {...props} path="message" label="prefilled" optional rows={2} />
          <TextInput
            {...props}
            path="label"
            label="buttonLabel"
            optional
            placeholderKey="whatsappLabel"
          />
        </div>
      );
    case "call":
      return (
        <div className="space-y-4">
          <TextInput
            {...props}
            path="number"
            label="phone"
            inputType="tel"
            placeholder="+33 6 12 34 56 78"
          />
          <TextInput
            {...props}
            path="label"
            label="buttonLabel"
            optional
            placeholderKey="callLabel"
          />
        </div>
      );
    case "email":
      return (
        <div className="space-y-4">
          <TextInput
            {...props}
            path="email"
            label="email"
            inputType="email"
            placeholder="vous@exemple.com"
          />
          <TextInput
            {...props}
            path="label"
            label="buttonLabel"
            optional
            placeholderKey="emailLabel"
          />
        </div>
      );
    case "service":
      return <ServiceForm {...props} />;
    case "youtube":
      return <YoutubeForm {...props} />;
    case "text":
      return (
        <div className="space-y-4">
          <TextInput {...props} path="title" label="title" optional />
          <TextArea {...props} path="body" label="body" rows={4} />
        </div>
      );
    case "divider":
      return <HintText name="divider" />;
    case "faq":
      return <FaqForm {...props} />;
    case "reviews":
      return <ReviewsForm {...props} />;
    case "hours":
      return <HoursForm {...props} />;
    case "gallery":
      return <GalleryForm {...props} />;
    case "pricing":
      return <PricingForm {...props} />;
    case "address":
      return (
        <div className="space-y-4">
          <TextArea
            {...props}
            path="address"
            label="address"
            rows={2}
            placeholderKey="addressPlaceholder"
          />
          <TextInput {...props} path="label" label="title" optional placeholderKey="addressLabel" />
        </div>
      );
    case "file":
      return <FileForm {...props} />;
    case "announcement":
      return (
        <div className="space-y-4">
          <TextInput {...props} path="title" label="title" placeholderKey="announcementTitle" />
          <TextArea {...props} path="text" label="body" optional rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput {...props} path="buttonLabel" label="buttonLabel" optional />
            <TextInput
              {...props}
              path="url"
              label="url"
              optional
              inputType="url"
              placeholder="https://"
            />
          </div>
        </div>
      );
    case "stats":
      return <StatsForm {...props} />;
    case "vcard":
      return (
        <div className="space-y-4">
          <HintText name="vcard" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput {...props} path="phone" label="phone" optional inputType="tel" />
            <TextInput {...props} path="email" label="email" optional inputType="email" />
          </div>
          <TextInput
            {...props}
            path="label"
            label="buttonLabel"
            optional
            placeholderKey="vcardLabel"
          />
        </div>
      );
  }
}

function HintText({ name }: { name: "divider" | "vcard" }) {
  const t = useTranslations("page.fields.hints");
  return <p className="text-ink-muted text-[13px] leading-relaxed">{t(name)}</p>;
}

/* -------------------------------------------------------------------------- */
/* Inputs bound to a path in the config                                        */
/* -------------------------------------------------------------------------- */

type LabelKey =
  | "url"
  | "title"
  | "body"
  | "phone"
  | "email"
  | "prefilled"
  | "buttonLabel"
  | "address"
  | "question"
  | "answer"
  | "name"
  | "review"
  | "label"
  | "price"
  | "note"
  | "value";

type PlaceholderKey =
  | "whatsappLabel"
  | "callLabel"
  | "emailLabel"
  | "vcardLabel"
  | "addressPlaceholder"
  | "addressLabel"
  | "announcementTitle"
  | "statValue"
  | "statLabel";

function get(config: Config, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => (node as Config | undefined)?.[key], config);
}

function set(config: Config, path: string, value: unknown): Config {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...config, [head]: value };
  const current = config[head];
  if (Array.isArray(current)) {
    const index = Number(rest[0]);
    const next = [...current];
    next[index] =
      rest.length === 1 ? value : set(current[index] as Config, rest.slice(1).join("."), value);
    return { ...config, [head]: next };
  }
  return { ...config, [head]: set((current as Config) ?? {}, rest.join("."), value) };
}

function TextInput({
  config,
  onChange,
  errorFor,
  touch,
  path,
  label,
  optional,
  inputType = "text",
  placeholder,
  placeholderKey,
  hint,
}: FormProps & {
  path: string;
  label: LabelKey;
  optional?: boolean;
  inputType?: "text" | "url" | "tel" | "email";
  placeholder?: string;
  placeholderKey?: PlaceholderKey;
  hint?: ReactNode;
}) {
  const t = useTranslations("page.fields");
  const tError = useTranslations("errors");
  const error = errorFor(path);
  return (
    <Field
      label={t(label)}
      optional={optional}
      error={error ? tError(error as "unexpected") : null}
      hint={hint}
    >
      <Input
        type={inputType}
        inputMode={inputType === "text" ? undefined : inputType}
        value={str(get(config, path))}
        placeholder={placeholderKey ? t(`placeholders.${placeholderKey}`) : placeholder}
        onChange={(event) => onChange(set(config, path, event.target.value))}
        onBlur={() => touch(path)}
      />
    </Field>
  );
}

function TextArea({
  config,
  onChange,
  errorFor,
  touch,
  path,
  label,
  optional,
  rows = 3,
  placeholderKey,
}: FormProps & {
  path: string;
  label: LabelKey;
  optional?: boolean;
  rows?: number;
  placeholderKey?: PlaceholderKey;
}) {
  const t = useTranslations("page.fields");
  const tError = useTranslations("errors");
  const error = errorFor(path);
  return (
    <Field
      label={t(label)}
      optional={optional}
      error={error ? tError(error as "unexpected") : null}
    >
      <Textarea
        rows={rows}
        value={str(get(config, path))}
        placeholder={placeholderKey ? t(`placeholders.${placeholderKey}`) : undefined}
        onChange={(event) => onChange(set(config, path, event.target.value))}
        onBlur={() => touch(path)}
      />
    </Field>
  );
}

/** A repeatable group (FAQ entries, prices, reviews): add, edit, remove. */
function Repeater({
  items,
  max,
  min = 1,
  onAdd,
  onRemove,
  addLabel,
  children,
}: {
  items: Item[];
  max: number;
  min?: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  children: (index: number) => ReactNode;
}) {
  const t = useTranslations("page.fields");
  return (
    <div className="space-y-3">
      {items.map((_, index) => (
        <div
          key={index}
          className="border-line bg-canvas/60 relative rounded-[var(--radius-sm)] border p-3.5"
        >
          {items.length > min ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={t("removeItem", { index: index + 1 })}
              className="text-ink-subtle hover:text-danger absolute top-2.5 right-2.5 rounded-full p-1.5 transition-colors"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <div className="space-y-3 pr-7">{children(index)}</div>
        </div>
      ))}
      {items.length < max ? (
        <button
          type="button"
          onClick={onAdd}
          className="border-line-strong text-ink-muted hover:border-ink/40 hover:text-ink flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed py-2.5 text-[13px] font-medium transition-colors"
        >
          <Plus className="size-3.5" aria-hidden />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per type                                                                    */
/* -------------------------------------------------------------------------- */

function LinkForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const url = str(props.config.url);
  const platform = detectPlatform(url);
  return (
    <div className="space-y-4">
      <TextInput
        {...props}
        path="url"
        label="url"
        inputType="url"
        placeholder="https://"
        hint={
          url ? (
            <span className="inline-flex items-center gap-1.5">
              <PlatformIcon platform={platform} className="size-3.5" />
              {t("detected", { platform: PLATFORM_NAMES[platform] })}
            </span>
          ) : null
        }
      />
      <Field label={t("title")} optional hint={t("titleHint")}>
        <Input
          value={str(props.config.title)}
          placeholder={linkLabel(url) || undefined}
          maxLength={80}
          onChange={(event) => props.onChange({ ...props.config, title: event.target.value })}
        />
      </Field>
    </div>
  );
}

function SocialsForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const tError = useTranslations("errors");
  const links = Array.isArray(props.config.links) ? (props.config.links as string[]) : [];
  const update = (next: string[]) => props.onChange({ ...props.config, links: next });

  return (
    <div className="space-y-2.5">
      <p className="text-ink-muted text-[13px]">{t("socialsHint")}</p>
      {links.map((link, index) => {
        const platform = detectPlatform(link);
        const error = props.errorFor(`links.${index}`);
        return (
          <div key={index}>
            <div className="border-line-strong bg-surface focus-within:border-ink flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border pr-1 pl-3 transition-colors">
              <PlatformIcon platform={platform} className="text-ink-subtle size-4 shrink-0" />
              <input
                type="url"
                inputMode="url"
                value={link}
                placeholder="instagram.com/…"
                aria-label={t("socialLink", { index: index + 1 })}
                onChange={(event) =>
                  update(links.map((item, i) => (i === index ? event.target.value : item)))
                }
                onBlur={() => props.touch(`links.${index}`)}
                className="text-ink placeholder:text-ink-subtle h-full min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none"
              />
              {links.length > 1 ? (
                <button
                  type="button"
                  onClick={() => update(links.filter((_, i) => i !== index))}
                  aria-label={t("removeItem", { index: index + 1 })}
                  className="text-ink-subtle hover:text-danger rounded-full p-2 transition-colors"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
            {error ? (
              <p className="text-danger mt-1 text-[13px]">{tError(error as "unexpected")}</p>
            ) : null}
          </div>
        );
      })}
      {links.length < 12 ? (
        <button
          type="button"
          onClick={() => update([...links, ""])}
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] font-medium"
        >
          <Plus className="size-3.5" aria-hidden />
          {t("addSocial")}
        </button>
      ) : null}
    </div>
  );
}

function ServiceForm({ offerTitle, offerId }: FormProps) {
  const t = useTranslations("page.fields");
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-ink-muted text-[13px] leading-relaxed">
        {offerTitle ? t("serviceHint", { title: offerTitle }) : t("serviceMissing")}
      </p>
      {offerId ? (
        <Link
          href={`/dashboard/offers/${offerId}`}
          className="text-ink inline-flex shrink-0 items-center gap-1 text-[13px] font-medium underline underline-offset-4"
        >
          {t("editOffer")}
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function YoutubeForm(props: FormProps) {
  const id = youtubeId(str(props.config.url));
  return (
    <div className="space-y-4">
      <TextInput
        {...props}
        path="url"
        label="url"
        inputType="url"
        placeholder="https://youtube.com/watch?v=…"
      />
      {id ? (
        <div className="border-line relative aspect-video w-40 overflow-hidden rounded-[var(--radius-xs)] border">
          <Image src={youtubeThumbnail(id)} alt="" fill sizes="160px" className="object-cover" />
        </div>
      ) : null}
      <TextInput {...props} path="title" label="title" optional />
    </div>
  );
}

function FaqForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const items = list(props.config.items);
  return (
    <div className="space-y-4">
      <TextInput {...props} path="title" label="title" optional />
      <Repeater
        items={items}
        max={12}
        addLabel={t("addQuestion")}
        onAdd={() =>
          props.onChange({ ...props.config, items: [...items, { question: "", answer: "" }] })
        }
        onRemove={(index) =>
          props.onChange({ ...props.config, items: items.filter((_, i) => i !== index) })
        }
      >
        {(index) => (
          <>
            <TextInput {...props} path={`items.${index}.question`} label="question" />
            <TextArea {...props} path={`items.${index}.answer`} label="answer" rows={2} />
          </>
        )}
      </Repeater>
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const t = useTranslations("page.fields");
  return (
    <div role="radiogroup" aria-label={t("rating")} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t("stars", { count: star })}
          onClick={() => onChange(star)}
          className="rounded p-0.5 text-[var(--color-brand)] transition-transform active:scale-90"
        >
          <Star
            className={cn("size-5", star <= value ? "fill-current" : "opacity-30")}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const items = list(props.config.items);
  return (
    <div className="space-y-4">
      <Field label={t("layout")}>
        <ChoiceChips
          label={t("layout")}
          value={(props.config.layout as "carousel" | "list") ?? "carousel"}
          onChange={(layout) => props.onChange({ ...props.config, layout })}
          options={[
            { value: "carousel", label: t("carousel") },
            { value: "list", label: t("list") },
          ]}
        />
      </Field>
      <Repeater
        items={items}
        max={12}
        addLabel={t("addReview")}
        onAdd={() =>
          props.onChange({ ...props.config, items: [...items, { name: "", text: "", rating: 5 }] })
        }
        onRemove={(index) =>
          props.onChange({ ...props.config, items: items.filter((_, i) => i !== index) })
        }
      >
        {(index) => (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <TextInput {...props} path={`items.${index}.name`} label="name" />
              </div>
              <RatingInput
                value={Number(items[index]?.rating ?? 5)}
                onChange={(rating) =>
                  props.onChange({
                    ...props.config,
                    items: items.map((item, i) => (i === index ? { ...item, rating } : item)),
                  })
                }
              />
            </div>
            <TextArea {...props} path={`items.${index}.text`} label="review" rows={2} />
          </>
        )}
      </Repeater>
    </div>
  );
}

function HoursForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const days = list(props.config.days) as unknown as DayHours[];
  const dayName = (weekday: number) =>
    new Intl.DateTimeFormat(props.locale, { weekday: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 7 + weekday)),
    );
  const update = (weekday: number, patch: Partial<DayHours>) =>
    props.onChange({
      ...props.config,
      days: days.map((day, i) => (i === weekday ? { ...day, ...patch } : day)),
    });

  return (
    <div className="space-y-4">
      <ul className="divide-line divide-y">
        {WEEK_ORDER.map((weekday) => {
          const day = days[weekday];
          if (!day) return null;
          return (
            <li key={weekday} className="flex flex-wrap items-center gap-3 py-2.5">
              <Toggle
                checked={!day.closed}
                onCheckedChange={(open) => update(weekday, { closed: !open })}
                label={dayName(weekday)}
              />
              <span className="text-ink w-24 text-[14px] capitalize">{dayName(weekday)}</span>
              {day.closed ? (
                <span className="text-ink-subtle text-[13px]">{t("closed")}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={day.open}
                    aria-label={t("opensAt", { day: dayName(weekday) })}
                    onChange={(event) => update(weekday, { open: event.target.value })}
                    className="border-line-strong h-9 rounded-[var(--radius-xs)] border px-2 text-[13.5px] tabular-nums"
                  />
                  <span className="text-ink-subtle">–</span>
                  <input
                    type="time"
                    value={day.close}
                    aria-label={t("closesAt", { day: dayName(weekday) })}
                    onChange={(event) => update(weekday, { close: event.target.value })}
                    className="border-line-strong h-9 rounded-[var(--radius-xs)] border px-2 text-[13.5px] tabular-nums"
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <TextInput {...props} path="note" label="note" optional />
    </div>
  );
}

function GalleryForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const images = list(props.config.images);
  const mode = (props.config.mode as "grid" | "before_after") ?? "grid";
  return (
    <div className="space-y-4">
      <Field label={t("layout")}>
        <ChoiceChips
          label={t("layout")}
          value={mode}
          onChange={(next) => props.onChange({ ...props.config, mode: next })}
          options={[
            { value: "grid", label: t("grid") },
            { value: "before_after", label: t("beforeAfter") },
          ]}
        />
      </Field>
      <p className="text-ink-muted text-[13px]">
        {mode === "grid" ? t("gridHint") : t("beforeAfterHint")}
      </p>
      <GalleryUpload
        folder="page"
        max={mode === "grid" ? 12 : 2}
        value={images.map((image) => str(image.url))}
        onChange={(urls) =>
          props.onChange({
            ...props.config,
            images: urls.map(
              (url) => images.find((image) => image.url === url) ?? { url, alt: null },
            ),
          })
        }
      />
      {props.errorFor("images") ? (
        <p className="text-danger text-[13px]">{t("imagesRequired")}</p>
      ) : null}
    </div>
  );
}

function PricingForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const items = list(props.config.items);
  return (
    <div className="space-y-4">
      <TextInput {...props} path="title" label="title" optional />
      <Repeater
        items={items}
        max={20}
        addLabel={t("addPrice")}
        onAdd={() =>
          props.onChange({
            ...props.config,
            items: [...items, { label: "", price: "", note: null }],
          })
        }
        onRemove={(index) =>
          props.onChange({ ...props.config, items: items.filter((_, i) => i !== index) })
        }
      >
        {(index) => (
          <>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <TextInput {...props} path={`items.${index}.label`} label="label" />
              <TextInput {...props} path={`items.${index}.price`} label="price" />
            </div>
            <TextInput {...props} path={`items.${index}.note`} label="note" optional />
          </>
        )}
      </Repeater>
    </div>
  );
}

function StatsForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const items = list(props.config.items);
  return (
    <div className="space-y-3">
      <p className="text-ink-muted text-[13px]">{t("statsHint")}</p>
      <Repeater
        items={items}
        max={3}
        addLabel={t("addStat")}
        onAdd={() =>
          props.onChange({ ...props.config, items: [...items, { value: "", label: "" }] })
        }
        onRemove={(index) =>
          props.onChange({ ...props.config, items: items.filter((_, i) => i !== index) })
        }
      >
        {(index) => (
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <TextInput
              {...props}
              path={`items.${index}.value`}
              label="value"
              placeholderKey="statValue"
            />
            <TextInput
              {...props}
              path={`items.${index}.label`}
              label="label"
              placeholderKey="statLabel"
            />
          </div>
        )}
      </Repeater>
    </div>
  );
}

function FileForm(props: FormProps) {
  const t = useTranslations("page.fields");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = str(props.config.name);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {props.config.url ? (
          <span className="border-line bg-canvas text-ink inline-flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-[13.5px]">
            <FileText className="text-ink-subtle size-4 shrink-0" aria-hidden />
            <span className="truncate">{name}.pdf</span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border-line-strong text-ink hover:border-ink/40 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-3.5" aria-hidden />
          )}
          {props.config.url ? t("replaceFile") : t("uploadFile")}
        </button>
      </div>
      <p className="text-ink-subtle text-[12.5px]">{t("fileHint")}</p>
      {error ? <p className="text-danger text-[13px]">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const uploaded = await uploadPdf(file);
            props.onChange({ ...props.config, url: uploaded.url, name: uploaded.name });
          } catch (caught) {
            const code = caught instanceof UploadError ? caught.code : "failed";
            setError(
              code === "too_large"
                ? t("fileTooLarge")
                : code === "unsupported"
                  ? t("fileType")
                  : t("fileFailed"),
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {props.config.url ? <TextInput {...props} path="name" label="name" /> : null}
      <TextInput {...props} path="label" label="buttonLabel" optional />
    </div>
  );
}
