"use client";

import { Slider as RadixSlider } from "radix-ui";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Sliders, for every number the product asks for inside a known range.
 *
 * Two shapes. `ScaleSlider` holds one value — a duration, a notice, a price —
 * on either a linear range or an explicit list of stops. Stops are how the
 * non-linear settings stay usable: a notice runs from none to a month, and
 * spread evenly that would make the first day a few pixels wide. `null` can be
 * a stop, for the settings where "no value" is itself an answer ("same as the
 * duration", "unlimited").
 *
 * `TimeRangeSlider` holds a start and an end on one day, for opening hours and
 * time-range details.
 *
 * The value is always written out above the track and updates while the thumb
 * moves, and it is what assistive tech reads (aria-valuetext), not the index
 * of a stop. Where an exact figure matters, `exact` adds a typed input beside
 * the track: the slider gets you close, the input gets you the cent.
 *
 * A value that is not on a stop — data saved before these sliders, or typed in
 * the exact input — is shown as it is; the thumb sits on the nearest stop and
 * nothing is rewritten until the person moves it.
 */

type Stop = number | null;

const trackClass = "bg-ink/10 relative h-1.5 grow overflow-hidden rounded-full";
const rangeClass = "bg-ink absolute h-full rounded-full";
const thumbClass =
  "border-ink bg-surface block size-5 cursor-grab rounded-full border-2 shadow-sm outline-none active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-ink/15 motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:scale-110 motion-safe:active:scale-115 data-[disabled]:cursor-not-allowed";

function nearestIndex(stops: readonly Stop[], value: Stop): number {
  const exact = stops.indexOf(value);
  if (exact !== -1) return exact;
  if (value === null) return 0;

  let best = 0;
  let distance = Infinity;
  stops.forEach((stop, index) => {
    if (stop === null) return;
    const gap = Math.abs(stop - value);
    if (gap < distance) {
      distance = gap;
      best = index;
    }
  });
  return best;
}

type ScaleProps<T extends Stop> = {
  /** Read out loud and used as the thumb's accessible name. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  /** How a value reads, above the track and to screen readers. */
  format: (value: T) => string;
  /** The small labels under the ends of the track. */
  edges?: [ReactNode, ReactNode];
  disabled?: boolean;
  className?: string;
  /**
   * A typed input beside the track, for values that must be exact. It accepts
   * anything within its own bounds, which may be wider than the track.
   */
  exact?: {
    min: number;
    max: number;
    step?: number;
    suffix?: ReactNode;
    /** The raw text, so a half-typed "12," is not erased under the cursor. */
    text: string;
    onText: (text: string) => void;
    invalid?: boolean;
  };
} & (
  | { stops: readonly T[]; min?: never; max?: never; step?: never }
  | {
      stops?: never;
      min: number;
      max: number;
      step: number;
    }
);

export function ScaleSlider<T extends Stop>(props: ScaleProps<T>) {
  const { label, value, onChange, format, edges, disabled, className, exact } = props;
  const inputId = useId();

  const stops = props.stops;
  const radixValue = stops
    ? nearestIndex(stops, value)
    : Math.min(props.max, Math.max(props.min, value ?? props.min));

  const valueText = format(value);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          <p
            aria-hidden
            className="text-ink text-[15px] font-semibold tracking-[-0.01em] tabular-nums"
          >
            {valueText}
          </p>
          <RadixSlider.Root
            className="relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50"
            min={stops ? 0 : props.min}
            max={stops ? stops.length - 1 : props.max}
            step={stops ? 1 : props.step}
            value={[radixValue]}
            disabled={disabled}
            onValueChange={([next]) => {
              const nextValue = (stops ? stops[next] : next) as T;
              if (nextValue !== value) onChange(nextValue);
            }}
          >
            <RadixSlider.Track className={trackClass}>
              <RadixSlider.Range className={rangeClass} />
            </RadixSlider.Track>
            <RadixSlider.Thumb
              className={thumbClass}
              aria-label={label}
              aria-valuetext={valueText}
            />
          </RadixSlider.Root>
        </div>

        {exact ? (
          <label
            htmlFor={inputId}
            className={cn(
              "border-line-strong bg-surface focus-within:border-ink flex h-11 w-32 shrink-0 items-center rounded-[var(--radius-sm)] border transition-colors",
              exact.invalid && "border-danger",
            )}
          >
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              min={exact.min}
              max={exact.max}
              step={exact.step ?? "any"}
              value={exact.text}
              disabled={disabled}
              aria-label={label}
              aria-invalid={exact.invalid || undefined}
              onChange={(event) => exact.onText(event.target.value)}
              className="text-ink h-full w-full min-w-0 bg-transparent pl-3 text-[15px] tabular-nums focus:outline-none"
            />
            {exact.suffix ? (
              <span className="text-ink-muted shrink-0 pr-3 pl-1 text-[13px]">{exact.suffix}</span>
            ) : null}
          </label>
        ) : null}
      </div>

      {edges ? (
        <div
          aria-hidden
          className={cn("text-ink-subtle flex justify-between text-[11.5px]", exact && "mr-36")}
        >
          <span>{edges[0]}</span>
          <span>{edges[1]}</span>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Time ranges                                                                 */
/* -------------------------------------------------------------------------- */

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/** 1440 is written 24:00 for display; storage clamps it to 23:59. */
export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 24 * 60));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function TimeRangeSlider({
  label,
  start,
  end,
  onChange,
  step = 15,
  min = 0,
  max = 24 * 60,
  format = fromMinutes,
  ticks = [0, 6, 12, 18, 24],
  readout = true,
  className,
}: {
  label: string;
  /** "HH:MM" */
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (minutes: number) => string;
  /** Hours marked under the track. */
  ticks?: number[];
  /** Writes "09:00 – 17:00" above the track, live while dragging. */
  readout?: boolean;
  className?: string;
}) {
  const [from, to] = [toMinutes(start), end === "23:59" ? 24 * 60 : toMinutes(end)];
  const [active, setActive] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      {readout ? (
        <p aria-hidden className="text-ink text-[15px] font-semibold tabular-nums">
          {format(from)} – {format(to)}
        </p>
      ) : null}
      <RadixSlider.Root
        className="relative flex h-6 w-full touch-none items-center select-none"
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        value={[from, to]}
        onPointerDown={() => setActive(true)}
        onValueCommit={() => setActive(false)}
        onValueChange={([nextFrom, nextTo]) =>
          onChange({
            start: fromMinutes(nextFrom),
            end: nextTo >= 24 * 60 ? "23:59" : fromMinutes(nextTo),
          })
        }
      >
        <RadixSlider.Track className={cn(trackClass, "h-2")}>
          <RadixSlider.Range
            className={cn(rangeClass, "motion-safe:transition-colors", active && "bg-ink/80")}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className={thumbClass}
          aria-label={`${label} — ${format(from)}`}
          aria-valuetext={format(from)}
        />
        <RadixSlider.Thumb
          className={thumbClass}
          aria-label={`${label} — ${format(to)}`}
          aria-valuetext={format(to)}
        />
      </RadixSlider.Root>

      {ticks.length > 0 ? (
        <div aria-hidden className="relative h-3.5">
          {ticks.map((hour) => {
            const position = ((hour * 60 - min) / (max - min)) * 100;
            if (position < 0 || position > 100) return null;
            return (
              <span
                key={hour}
                className="text-ink-subtle absolute top-0 -translate-x-1/2 text-[10.5px] tabular-nums first:translate-x-0 last:-translate-x-full"
                style={{ left: `${position}%` }}
              >
                {/* Bare hours read the same in both locales; "18h" and "6 PM" do not. */}
                {String(hour).padStart(2, "0")}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
