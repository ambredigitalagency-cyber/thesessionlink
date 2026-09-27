"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceGroup } from "@/components/ui/choice-cards";
import { useTheme } from "@/components/preferences/theme-provider";
import { THEMES } from "@/lib/theme";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/**
 * Paper, night, or whatever the device says.
 *
 * Three options rather than a switch, because "follow my system" is a real
 * answer and not the absence of one: a phone that goes dark at sunset should
 * take this page with it, and a two-state toggle can only ever freeze you on
 * one side of that.
 *
 * The state is shared with the switch in every page's corner, and applied the
 * same way by ThemeProvider (components/preferences/theme-provider.tsx).
 */
export function ThemeChoice() {
  const t = useTranslations("dashboard.settings.appearance");
  const { theme, setTheme: choose } = useTheme();

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
