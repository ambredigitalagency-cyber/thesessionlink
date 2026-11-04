"use client";

import { Check, Pipette } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import {
  ACCENT_PRESETS,
  THEME_IDS,
  THEMES,
  accentPalette,
  contrast,
  normalizeHex,
  themeStyle,
  type ThemeId,
} from "@/lib/page/themes";
import { cn } from "@/lib/utils";

/**
 * Theme and accent. Each theme card is drawn with the page's own classes at
 * half size — the buttons, the card, the background a visitor will see — so
 * choosing is comparing real things, and the preview beside updates at once.
 */
export function AppearancePanel({
  theme,
  accent,
  onChange,
}: {
  theme: ThemeId;
  accent: string;
  onChange: (next: { theme: ThemeId; accent: string }) => void;
}) {
  const t = useTranslations("page.appearance");
  const custom = !ACCENT_PRESETS.includes(accent as (typeof ACCENT_PRESETS)[number]);
  const palette = accentPalette(accent, THEMES[theme]);
  const adjusted = contrast(normalizeHex(accent) ?? accent, THEMES[theme].base) < 4.5;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-ink text-[15px] font-semibold">{t("themeTitle")}</h2>
        <p className="text-ink-muted mt-0.5 text-[13px]">{t("themeHint")}</p>
        <ThemePicker
          className="mt-4"
          label={t("themeTitle")}
          theme={theme}
          accent={accent}
          onSelect={(id) => onChange({ theme: id, accent })}
        />
      </section>

      <section>
        <h2 className="text-ink text-[15px] font-semibold">{t("accentTitle")}</h2>
        <p className="text-ink-muted mt-0.5 text-[13px]">{t("accentHint")}</p>
        <div
          role="radiogroup"
          aria-label={t("accentTitle")}
          className="mt-4 flex flex-wrap items-center gap-2.5"
        >
          {ACCENT_PRESETS.map((color) => {
            const selected = color === accent;
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color}
                onClick={() => onChange({ theme, accent: color })}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-90",
                  selected ? "ring-ink ring-2 ring-offset-2" : "hover:scale-110",
                )}
                style={{ background: color }}
              >
                {selected ? (
                  <Check
                    className="size-4"
                    style={{ color: accentPalette(color, THEMES.classic).on }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
          <label
            className={cn(
              "border-line-strong text-ink-muted hover:border-ink/40 relative flex h-9 cursor-pointer items-center gap-2 rounded-full border pr-3.5 pl-1 text-[13px] transition-colors",
              custom && "border-ink text-ink ring-ink ring-1",
            )}
          >
            <span
              className="flex size-7 items-center justify-center rounded-full"
              style={{ background: accent }}
            >
              <Pipette className="size-3.5" style={{ color: palette.on }} aria-hidden />
            </span>
            {t("custom")}
            <input
              type="color"
              value={normalizeHex(accent) ?? "#f2542d"}
              onChange={(event) => onChange({ theme, accent: event.target.value })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={t("customLabel")}
            />
          </label>
        </div>
        <p className="text-ink-muted mt-3 text-[12.5px] leading-relaxed" aria-live="polite">
          {adjusted ? t("adjusted") : t("readable")}
        </p>
      </section>
    </div>
  );
}

/**
 * The eight themes as cards, each drawn with the page's own classes at half
 * size. Shared by "Ma page" and the sign-up's appearance screen.
 */
export function ThemePicker({
  theme,
  accent,
  onSelect,
  label,
  name = "editor",
  className,
}: {
  theme: ThemeId;
  accent: string;
  onSelect: (theme: ThemeId) => void;
  label: string;
  /** Unique per picker on a screen: the tick travels between its cards. */
  name?: string;
  className?: string;
}) {
  const t = useTranslations("page.appearance");

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}
    >
      {THEME_IDS.map((id, index) => {
        const selected = id === theme;
        const preview = THEMES[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(id)}
            style={{ "--rise-delay": `${index * 0.03}s` } as CSSProperties}
            className={cn(
              "rise-in group relative rounded-[var(--radius-md)] border p-1.5 text-left transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.97]",
              selected
                ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]"
                : "border-line-strong hover:border-ink/30",
            )}
          >
            <ThemeThumbnail id={id} accent={accent} />
            <span className="text-ink mt-2 block px-1 pb-1 text-[13px] font-medium">
              {t(`themes.${id}`)}
              {preview.dark ? (
                <span className="text-ink-subtle ml-1.5 text-[11px] font-normal">{t("dark")}</span>
              ) : null}
            </span>
            {selected ? (
              <motion.span
                layoutId={`theme-tick-${name}`}
                className="bg-ink text-ink-inverse absolute top-3 right-3 flex size-5 items-center justify-center rounded-full"
              >
                <Check className="size-3" aria-hidden />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ThemeThumbnail({ id, accent }: { id: ThemeId; accent: string }) {
  const theme = THEMES[id];
  const style = themeStyle(theme, accentPalette(accent, theme));
  return (
    <span aria-hidden className="relative block h-32 overflow-hidden rounded-[10px]">
      <span
        style={style}
        data-buttons={theme.buttons}
        data-cards={theme.cards}
        className="page-root absolute top-0 left-0 block w-[200%] origin-top-left scale-50 px-6 pt-6"
      >
        <span className="mx-auto block size-14 rounded-full bg-[var(--accent)]" />
        <span className="mx-auto mt-3 block h-3 w-28 rounded-full bg-[var(--page-text)] opacity-80" />
        <span className="mt-5 block space-y-3">
          <span className="page-btn !min-h-12 justify-center">
            <span className="h-2.5 w-24 rounded-full bg-current opacity-70" />
          </span>
          <span className="page-btn page-btn-primary !min-h-12 justify-center">
            <span className="h-2.5 w-20 rounded-full bg-current opacity-80" />
          </span>
        </span>
      </span>
    </span>
  );
}
