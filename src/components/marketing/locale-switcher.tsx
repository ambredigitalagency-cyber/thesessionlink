"use client";

import { Check, Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/actions/settings";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ tone = "ink" }: { tone?: "ink" | "inverse" }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          tone === "ink" ? "text-ink-muted hover:text-ink" : "text-white/70 hover:text-white",
          pending && "opacity-60",
        )}
        aria-label="Language"
      >
        <Languages className="size-4" />
        <span className="uppercase">{locale}</span>
      </MenuTrigger>
      <MenuContent align="end">
        {LOCALES.map((item) => (
          <MenuItem
            key={item}
            onSelect={() =>
              startTransition(async () => {
                await setLocale(item);
                router.refresh();
              })
            }
          >
            <span className="flex-1">{LOCALE_LABELS[item]}</span>
            {item === locale ? <Check className="size-3.5" /> : null}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
