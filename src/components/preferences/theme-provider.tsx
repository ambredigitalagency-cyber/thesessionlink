"use client";

import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";

import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

/**
 * The reader's theme, shared by every control that can change it — the switch
 * in each page's corner and the choice in Settings — so moving one moves the
 * other.
 *
 * It starts from the cookie the server already read (root layout), so the
 * switch is drawn in the right position in the first byte, like the page.
 *
 * The change is applied to the document first and written to the cookie
 * second: the attribute is what the stylesheet reads, so the page turns over
 * in the same frame as the tap; the cookie only has to be right by the time
 * the server renders the next page. `theme-switching` on <html> makes the swap
 * a 200ms cross-fade, and is taken off straight after so hovers stay instant.
 * Under reduced motion that class does nothing: the rule that reads it lives
 * inside a no-preference query.
 */

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ initial, children }: { initial: Theme; children: ReactNode }) {
  const [theme, setState] = useState<Theme>(initial);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTheme = useCallback((next: Theme) => {
    setState(next);
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
  }, []);

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) throw new Error("useTheme outside ThemeProvider");
  return context;
}
