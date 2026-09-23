"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The dashboard's charts, drawn as plain SVG.
 *
 * No charting library: these are three shapes (columns, a share bar, a meter)
 * built from the product's own tokens, which keeps the bundle flat and lets the
 * marks follow the design system exactly. Every chart carries a table for
 * screen readers, so no value is reachable through hover alone.
 *
 * Series colours live in lib/stats/palette.
 */

const COLUMN_RADIUS = 4;

export type Point = { key: string; label: string; value: number };

/**
 * Columns over time, one series. Hovering a column lifts it and shows its
 * value; the tallest column is labelled directly so the chart still reads
 * without a pointer.
 */
export function ColumnChart({
  points,
  format,
  title,
  color = "var(--color-brand)",
  emptyLabel,
}: {
  points: Point[];
  format: (value: number) => string;
  title: string;
  color?: string;
  emptyLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const tableId = useId();

  const max = Math.max(...points.map((point) => point.value), 0);
  if (points.length === 0 || max === 0) {
    return (
      <div className="border-line text-ink-subtle flex h-[180px] items-center justify-center rounded-[var(--radius-sm)] border border-dashed text-[13px]">
        {emptyLabel}
      </div>
    );
  }

  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), points[0]);
  const active = hovered === null ? null : points[hovered];

  return (
    <figure className="m-0">
      {/* The top padding is the room the value labels sit in, so the tallest
          column never has its own label printed on top of it. */}
      <div className="relative h-[204px] pt-6">
        <div className="flex h-full items-end gap-[2px]">
          {points.map((point, index) => {
            const ratio = point.value / max;
            const height = Math.max(ratio * 100, point.value > 0 ? 3 : 0);
            const isPeak = point.key === peak.key;

            return (
              <button
                key={point.key}
                type="button"
                // The hit target is the whole column slot, not the painted bar.
                className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                aria-describedby={tableId}
              >
                {(isPeak || hovered === index) && point.value > 0 ? (
                  <span
                    style={{ bottom: `calc(${height}% + 4px)` }}
                    className="text-ink-muted absolute left-1/2 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap tabular-nums"
                  >
                    {format(point.value)}
                  </span>
                ) : null}
                <motion.span
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: `${height}%`,
                    backgroundColor: color,
                    borderRadius: `${COLUMN_RADIUS}px ${COLUMN_RADIUS}px 0 0`,
                    transformOrigin: "bottom",
                    maxWidth: "24px",
                  }}
                  className={cn(
                    "mx-auto w-full transition-opacity duration-150",
                    hovered !== null && hovered !== index ? "opacity-45" : "opacity-100",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="bg-line h-px w-full" />
      </div>

      <div className="text-ink-subtle mt-2 flex justify-between text-[11px]">
        <span>{points[0].label}</span>
        {active ? (
          <span className="text-ink font-medium">
            {active.label} · {format(active.value)}
          </span>
        ) : null}
        <span>{points[points.length - 1].label}</span>
      </div>

      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{format(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export type Slice = { id: string; label: string; value: number; share: number; color: string };

/**
 * One horizontal bar split into shares, with the legend doubling as the table.
 * Horizontal because offer names are long, and a legend list is easier to scan
 * than slices of a pie.
 */
export function ShareBar({
  slices,
  countLabel,
}: {
  slices: Slice[];
  countLabel: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden">
        {slices.map((slice) => (
          <motion.span
            key={slice.id}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: `${Math.max(slice.share * 100, 1.5)}%`,
              backgroundColor: slice.color,
              transformOrigin: "left",
            }}
            className={cn(
              "h-full rounded-[2px] transition-opacity duration-150",
              hovered && hovered !== slice.id ? "opacity-40" : "opacity-100",
            )}
          />
        ))}
      </div>

      <ul className="space-y-2">
        {slices.map((slice) => (
          <li
            key={slice.id}
            onMouseEnter={() => setHovered(slice.id)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-2.5 text-[13.5px]"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-ink-muted min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="text-ink-subtle tabular-nums">{countLabel(slice.value)}</span>
            <span className="text-ink w-12 text-right font-medium tabular-nums">
              {Math.round(slice.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A single ratio against its limit: a track, a fill, and the number in words. */
export function Meter({
  value,
  label,
  caption,
  tone = "brand",
}: {
  /** 0–1. */
  value: number;
  label: string;
  caption: string;
  tone?: "brand" | "warning";
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink-muted text-[13px]">{label}</span>
        <span className="text-ink text-[20px] font-semibold tabular-nums">{percent}%</span>
      </div>
      <div
        className="bg-ink/[0.06] h-2 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: `${percent}%`,
            transformOrigin: "left",
            backgroundColor: tone === "warning" ? "var(--color-warning)" : "var(--color-brand)",
          }}
          className="h-full rounded-full"
        />
      </div>
      <p className="text-ink-subtle text-[12.5px] leading-snug">{caption}</p>
    </div>
  );
}

/** The big numbers at the top of the page. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-ink-muted text-[13px]">{label}</p>
      <p className="text-ink mt-1.5 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-ink-subtle mt-1.5 text-[12.5px]">{hint}</p> : null}
    </div>
  );
}
