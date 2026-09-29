"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { localized, type CategoryField } from "@/lib/offers/schema";
import type { FieldType } from "@/lib/offers/fields";
import { cn } from "@/lib/utils";

import { FIELD_ICONS } from "./custom-fields-editor";

/** The offer field a category suggestion turns into, for its icon and name. */
const FIELD_TYPE_OF: Record<CategoryField["type"], FieldType> = {
  text: "text",
  textarea: "text",
  number: "number",
  select: "select",
  multiselect: "multiselect",
  boolean: "boolean",
  time: "time",
  images: "images",
};

/**
 * The details an activity usually shows for the chosen action, as a list the
 * coach unticks rather than a list they have to build.
 *
 * Every row arrives ticked — the template is a head start, and ticking four
 * boxes to get a head start is not one. Unticking takes the field out of the
 * offer at once and ticking puts it back, so the editor underneath is always
 * the truth: what is ticked is what is being filled in.
 *
 * The rows rise in one after another and the tick draws itself; both are CSS
 * (`.rise-in`, a stroke-dashoffset transition behind motion-safe), so with
 * reduced motion the list is simply there and a tick simply appears.
 */
export function TemplateChecklist({
  eyebrow,
  suggestions,
  checked,
  locale,
  onToggle,
}: {
  /** "Fitness coach · Calendar booking" */
  eyebrow: string;
  suggestions: CategoryField[];
  /** Keys of the suggestions currently in the offer. */
  checked: ReadonlySet<string>;
  locale: string;
  onToggle: (suggestion: CategoryField) => void;
}) {
  const t = useTranslations("offers.fields");
  const kept = suggestions.filter((suggestion) => checked.has(suggestion.key)).length;

  return (
    <section
      aria-labelledby="offer-template-title"
      className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--accent)_22%,var(--color-line))] bg-[color-mix(in_oklab,var(--accent-soft)_45%,var(--color-surface))] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-[11.5px] font-medium tracking-[0.08em] text-[var(--accent-ink)] uppercase">
            {eyebrow}
          </p>
          <h3 id="offer-template-title" className="text-ink mt-1 text-[15px] font-semibold">
            {t("template.title")}
          </h3>
        </div>
        <p className="text-ink-muted text-[12.5px] tabular-nums" aria-live="polite">
          {t("template.kept", { count: kept, total: suggestions.length })}
        </p>
      </div>
      <p className="text-ink-muted mt-1 text-[13px] leading-relaxed">{t("template.hint")}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => {
          const on = checked.has(suggestion.key);
          const type = FIELD_TYPE_OF[suggestion.type];
          const Icon = FIELD_ICONS[type];
          return (
            <li
              key={suggestion.key}
              className="rise-in"
              style={{ "--rise-delay": `${0.06 + index * 0.07}s` } as CSSProperties}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggle(suggestion)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left",
                  "transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.985]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2",
                  on
                    ? "bg-surface border-[color-mix(in_oklab,var(--accent)_45%,transparent)] shadow-[var(--shadow-card)]"
                    : "border-line-strong hover:border-ink/25 bg-transparent",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors duration-200",
                    on
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-on)]"
                      : "border-line-strong bg-surface group-hover:border-ink/40",
                  )}
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={on ? 0 : 1}
                      className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-[var(--ease-out-expo)]"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[14px] font-medium transition-colors",
                      on ? "text-ink" : "text-ink-muted",
                    )}
                  >
                    {localized(suggestion.label, locale, suggestion.key)}
                  </span>
                  <span className="text-ink-subtle flex items-center gap-1 text-[12px]">
                    <Icon className="size-3" aria-hidden />
                    {t(`types.${type}.name`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
