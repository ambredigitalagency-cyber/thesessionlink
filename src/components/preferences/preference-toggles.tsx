"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useRef,
  useTransition,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { setLocale } from "@/actions/settings";
import { useTheme } from "@/components/preferences/theme-provider";
import type { Locale } from "@/lib/i18n/config";
import { THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Language and theme, as two small slide toggles in the corner of every page.
 *
 * A thumb that slides between positions, like a switch, rather than a menu: a
 * menu hides the answer behind a tap, a toggle shows it. Two toggles side by
 * side rather than one control for both, because they answer different
 * questions — FR | EN, and ☀ | ◐ | ☾ (light, the device's choice, dark).
 *
 * Each is a radio group: arrow keys move the choice, the thumb follows. The
 * slide is a transform transition gated by motion-safe, so with reduced
 * motion the thumb simply appears in its new place.
 *
 * The tone follows the area: `brand` on the landing and public pages (the
 * accent of the page), `paper` in the dashboard and plain pages, `steel` in
 * the console, `night` on the console's dark sign-in, `glass` over a public
 * profile's banner.
 */

export type ToggleTone = "brand" | "paper" | "steel" | "night" | "glass";

const TONES: Record<ToggleTone, { track: string; thumb: string; on: string; off: string }> = {
  brand: {
    track: "bg-ink/[0.05] ring-line",
    thumb: "bg-surface ring-[color-mix(in_oklab,var(--accent)_35%,transparent)] shadow-sm",
    on: "text-[var(--accent-ink)]",
    off: "text-ink-subtle hover:text-ink",
  },
  paper: {
    track: "bg-ink/[0.05] ring-line",
    thumb: "bg-surface ring-line-strong shadow-sm",
    on: "text-ink",
    off: "text-ink-subtle hover:text-ink",
  },
  steel: {
    track: "bg-[var(--console-accent-soft)] ring-[var(--console-accent)]/20",
    thumb: "bg-surface ring-[var(--console-accent)]/40 shadow-sm",
    on: "text-[var(--console-accent-ink)]",
    off: "text-ink-subtle hover:text-[var(--console-accent-ink)]",
  },
  night: {
    track: "bg-white/[0.06] ring-white/10",
    thumb: "bg-white/[0.14] ring-[var(--console-rail-accent)]/40",
    on: "text-white",
    off: "text-white/55 hover:text-white",
  },
  glass: {
    track: "bg-surface/75 ring-line backdrop-blur-md",
    thumb: "bg-surface ring-[color-mix(in_oklab,var(--accent)_35%,transparent)] shadow-sm",
    on: "text-[var(--accent-ink)]",
    off: "text-ink-muted hover:text-ink",
  },
};

function SlideToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  tone,
  busy,
  dense,
}: {
  label: string;
  value: T;
  options: { value: T; content: ReactNode; title: string }[];
  onChange: (value: T) => void;
  tone: ToggleTone;
  busy?: boolean;
  /** A notch smaller below the sm breakpoint, for crowded phone headers. */
  dense?: boolean;
}) {
  const colors = TONES[tone];
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-grid shrink-0 rounded-full p-0.5 ring-1 ring-inset",
        colors.track,
        busy && "opacity-70",
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-full ring-1 ring-inset",
          "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[var(--ease-out-expo)]",
          colors.thumb,
        )}
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, position) => {
        const selected = position === index;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[position] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={option.title}
            aria-label={option.title}
            onClick={() => !selected && onChange(option.value)}
            className={cn(
              "relative z-10 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold tracking-wide transition-colors duration-200",
              dense && "max-sm:h-6 max-sm:min-w-6 max-sm:px-1 max-sm:text-[10.5px]",
              "focus-visible:outline-2 focus-visible:outline-offset-1",
              selected ? colors.on : colors.off,
            )}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}

const THEME_ICONS: Record<Theme, typeof Sun> = { light: Sun, system: Monitor, dark: Moon };
/** French first: the product speaks French first. */
const LOCALE_ORDER: Locale[] = ["fr", "en"];

/** Light on the left, dark on the right, the device's choice between them. */
const THEME_ORDER: Theme[] = ["light", "system", "dark"];

export function PreferenceToggles({
  tone = "paper",
  dense = false,
  className,
}: {
  tone?: ToggleTone;
  dense?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.preferences");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  function changeLocale(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <SlideToggle
        label={t("language")}
        value={locale}
        onChange={changeLocale}
        tone={tone}
        dense={dense}
        busy={pending}
        options={LOCALE_ORDER.map((item) => ({
          value: item,
          content: <span className="uppercase">{item}</span>,
          title: t(`languages.${item}`),
        }))}
      />
      <SlideToggle
        label={t("theme")}
        value={theme}
        onChange={setTheme}
        tone={tone}
        dense={dense}
        options={THEME_ORDER.filter((item) => THEMES.includes(item)).map((item) => {
          const Icon = THEME_ICONS[item];
          return {
            value: item,
            content: <Icon className="size-3.5" aria-hidden />,
            title: t(`themes.${item}`),
          };
        })}
      />
    </div>
  );
}
