import type { ReactNode } from "react";

/**
 * The top of a console page.
 *
 * One eyebrow, one title, one line of subtitle — the same three lines on all
 * three pages, so moving between them feels like moving inside one tool rather
 * than between three screens that happen to share a URL prefix. The eyebrow is
 * what the rail calls this section, which is the second place someone can read
 * where they are without having to look at the address bar.
 */
export function ConsoleHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold tracking-[0.1em] text-[var(--console-accent-ink)] uppercase">
          {eyebrow}
        </p>
        <h1 className="text-ink mt-1.5 text-[26px] leading-tight font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        {subtitle ? <p className="text-ink-muted mt-1 text-[15px]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
