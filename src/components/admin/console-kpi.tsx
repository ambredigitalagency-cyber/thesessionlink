"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The four numbers the console exists to answer.
 *
 * They used to be `StatTile`s — the same small card the coach's statistics
 * page uses, at 28px. That is the right size for a coach checking their week
 * and the wrong one here: this is the first screen of a control room, and the
 * whole point of opening it is those four figures. So they are set large, and
 * each carries the one line of context that makes it mean something — a total
 * without "of which how many on trial" is a number, not an answer.
 *
 * `breakdown` is the small print under the figure, given as parts so the
 * numbers inside it stay tabular and aligned with the big one above.
 *
 * The entrance is the `.rise-in` class, which the browser declines by itself
 * when the reader prefers less movement. Nothing here reads that preference in
 * JavaScript — a preference-dependent style rendered on the server is the
 * hydration mismatch this codebase has already been bitten by twice.
 */

export type KpiPart = { value: string; label: string };

export function ConsoleKpi({
  label,
  value,
  parts,
  tone = "neutral",
  index = 0,
  footnote,
}: {
  label: string;
  value: string;
  /** Two or three fragments of context, shown under the figure. */
  parts?: KpiPart[];
  /** "accent" marks the figure the console is actually steering by. */
  tone?: "neutral" | "accent" | "quiet";
  index?: number;
  footnote?: ReactNode;
}) {
  return (
    <div
      style={{ "--rise-delay": `${index * 0.05}s` } as CSSProperties}
      className={cn(
        "rise-in border-line bg-surface flex flex-col rounded-[var(--radius-lg)] border p-5",
        tone === "accent" && "border-[var(--console-accent)]/35",
      )}
    >
      <p className="text-ink-muted text-[12.5px] font-medium tracking-[0.04em] uppercase">
        {label}
      </p>

      <p
        className={cn(
          "mt-3 text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums",
          tone === "accent" ? "text-[var(--console-accent-ink)]" : "text-ink",
          tone === "quiet" && "text-ink-muted",
        )}
      >
        {value}
      </p>

      {parts && parts.length > 0 ? (
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {parts.map((part) => (
            <div key={part.label} className="flex items-baseline gap-1.5">
              <dt className="sr-only">{part.label}</dt>
              <dd className="text-ink text-[14px] font-medium tabular-nums">{part.value}</dd>
              <span aria-hidden className="text-ink-subtle text-[12.5px]">
                {part.label}
              </span>
            </div>
          ))}
        </dl>
      ) : null}

      {footnote ? (
        <p className="text-ink-subtle mt-auto pt-4 text-[12px] leading-snug">{footnote}</p>
      ) : null}
    </div>
  );
}

/** A titled panel. The console's one container, so every block sits the same. */
export function ConsolePanel({
  title,
  hint,
  action,
  children,
  className,
  index = 0,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <section
      style={{ "--rise-delay": `${index * 0.05}s` } as CSSProperties}
      className={cn("rise-in border-line bg-surface rounded-[var(--radius-lg)] border", className)}
    >
      <div className="border-line flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-ink text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {hint ? <p className="text-ink-muted mt-0.5 text-[13px]">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
