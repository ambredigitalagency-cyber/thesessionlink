"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ChoiceGroup } from "@/components/ui/choice-cards";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEMES, type Theme } from "@/lib/theme";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/**
 * Paper, night, or whatever the device says.
 *
 * Three options rather than a switch, because "follow my system" is a real
 * answer and not the absence of one: a phone that goes dark at sunset should
 * take this page with it, and a two-state toggle can only ever freeze you on
 * one side of that.
 *
 * The change is applied to the document first and written to the cookie
 * second. The attribute is what the stylesheet reads, so the page turns over
 * in the same frame as the tap; the cookie only has to be right by the time
 * the server renders the *next* page. Doing it the other way round — posting
 * to the server and waiting for a re-render — would put a round trip between
 * a person and a preference they can see.
 *
 * `theme-switching` on <html> is what makes the swap a 200ms cross-fade rather
 * than a slap, and it is taken off again straight after so the rest of the
 * session keeps its instant hovers. Under reduced motion the class does
 * nothing at all: the rule that reads it lives inside a no-preference query.
 */
export function ThemeChoice({ value }: { value: Theme }) {
  const t = useTranslations("dashboard.settings.appearance");
  const [theme, setTheme] = useState<Theme>(value);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);

  function choose(next: Theme) {
    setTheme(next);

    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.theme = next;

    clearTimeout(settling.current ?? undefined);
    settling.current = setTimeout(() => root.classList.remove("theme-switching"), 240);

    document.cookie = [
      `${THEME_COOKIE}=${next}`,
      "path=/",
      `max-age=${THEME_COOKIE_MAX_AGE}`,
      "samesite=lax",
      // The page is served over https everywhere but a developer's machine.
      location.protocol === "https:" ? "secure" : "",
    ]
      .filter(Boolean)
      .join("; ");
  }

  return (
    <ChoiceGroup
      name="theme"
      label={t("title")}
      layout="tile"
      columns={3}
      value={theme}
      onChange={choose}
      options={THEMES.map((option) => {
        const Icon = ICONS[option];
        return {
          value: option,
          title: t(option),
          visual: <Icon className="size-5" aria-hidden />,
        };
      })}
    />
  );
}
