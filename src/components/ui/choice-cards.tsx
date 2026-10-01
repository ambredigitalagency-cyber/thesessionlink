"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Closed questions, answered by pointing at a picture instead of opening a
 * menu.
 *
 * A `<select>` hides every option but one until it is opened, which is the
 * wrong shape for a question whose whole difficulty is *comparing* the
 * answers — which action type suits this offer, which kind of field to add.
 * These lay the options out flat, each with its own drawing, and the answer is
 * one tap.
 *
 * Two groups are provided because two sizes of question exist:
 *
 *   * ChoiceGroup — the question owns the screen. Cards with a visual, a
 *     title and usually a line of explanation.
 *   * ChoiceChips — a setting inside a longer form, where a row of pills is
 *     the honest size. Same semantics, a tenth of the space.
 *
 * (ChoiceToggleGroup, further down, is ChoiceGroup for questions with several
 * answers; what follows about radios applies to the two above.)
 *
 * Both are radio groups. Arrow keys move focus without selecting: selecting
 * here has consequences — it can reveal different settings, or advance the
 * flow — and a group where arrowing through the options fires all of them on
 * the way past is unusable. Selection therefore happens on activation only:
 * click, Enter or Space.
 *
 * Movement: the entrance is the `.rise-in` class and the squeeze on tap is
 * `active:scale`, both of which the browser drops on its own when the reader
 * prefers reduced motion. Nothing here reads the preference in JavaScript,
 * because a preference-dependent style rendered on the server is a hydration
 * mismatch (see the note on `.rise-in` in globals.css). The one exception is
 * the tick, which travels from the old card to the new one through a layout
 * animation — those Motion already drops under the same preference, and they
 * are measured after mount, so they never reach the server's HTML.
 */

export type Choice<T extends string> = {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  /** A short mark beside the title — "suggested", a count. */
  badge?: ReactNode;
  /** Icon, pictogram or a whole drawing. */
  visual?: ReactNode;
  disabled?: boolean;
};

/** Arrow keys walk the group; the browser handles activation. */
function useRovingFocus() {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const delta = steps[event.key];
    if (!delta) return;

    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-choice]:not(:disabled)") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    event.preventDefault();
    buttons[(index + delta + buttons.length) % buttons.length].focus();
  }

  return { listRef, onKeyDown };
}

const COLUMNS = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  // The days of a week: a row of seven where there is room, four then three.
  7: "grid-cols-4 sm:grid-cols-7",
} as const;

type CardLayout = "tile" | "row";
type CardVisual = "bubble" | "bare";

/** Cards come in one after another, capped so a long list is not a queue. */
function riseDelay(index: number): CSSProperties {
  return { "--rise-delay": `${Math.min(index, 12) * 0.035}s` } as CSSProperties;
}

/** The card itself, shared by the single-answer and the several-answer groups. */
function cardClass(selected: boolean, layout: CardLayout, compact: boolean) {
  return cn(
    "rise-in group relative rounded-[var(--radius-md)] border transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45",
    layout === "tile"
      ? cn(
          "flex flex-col items-center text-center",
          // The extra top keeps the tick off the drawing, as on the big tiles.
          compact ? "gap-1.5 px-1.5 pt-5 pb-3" : "gap-2.5 p-4",
        )
      : "flex items-start gap-3 p-3.5 text-left",
    selected
      ? "border-ink bg-ink/[0.035] shadow-[0_0_0_1px_var(--color-ink)]"
      : "border-line-strong hover:border-ink/30 hover:bg-canvas",
  );
}

/** Visual, title, description — everything in a card but the tick. */
function CardBody<T extends string>({
  option,
  selected,
  layout,
  visual,
}: {
  option: Choice<T>;
  selected: boolean;
  layout: CardLayout;
  visual: CardVisual;
}) {
  return (
    <>
      {option.visual ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center transition-colors duration-200",
            visual === "bubble"
              ? cn(
                  "rounded-full",
                  layout === "tile" ? "size-11" : "mt-0.5 size-9",
                  selected ? "bg-ink text-ink-inverse" : "bg-ink/5 text-ink-muted",
                )
              : layout === "tile"
                ? "w-full max-w-[148px]"
                : "mt-0.5 w-16 shrink-0",
          )}
        >
          {option.visual}
        </span>
      ) : null}

      <span className={cn("min-w-0", layout === "tile" ? "w-full" : "flex-1")}>
        <span className={cn("flex items-center gap-2", layout === "tile" && "justify-center")}>
          <span className="text-ink text-[14px] leading-tight font-medium">{option.title}</span>
          {option.badge}
        </span>
        {option.description ? (
          <span className="text-ink-muted mt-1 block text-[12.5px] leading-snug">
            {option.description}
          </span>
        ) : null}
      </span>
    </>
  );
}

function tickClass(layout: CardLayout, compact = false) {
  return cn(
    "bg-ink text-ink-inverse flex size-4.5 shrink-0 items-center justify-center rounded-full",
    layout === "tile"
      ? compact
        ? "absolute top-1.5 right-1.5"
        : "absolute top-2.5 right-2.5"
      : "mt-1",
  );
}

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
  layout = "row",
  columns = 2,
  visual = "bubble",
  className,
}: {
  label: string;
  options: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Unique per group: the travelling tick is a shared layout animation. */
  name: string;
  /** "tile" stacks the visual over the text, "row" sets it beside. */
  layout?: CardLayout;
  columns?: keyof typeof COLUMNS;
  /** "bubble" frames the visual in a disc; "bare" lets a drawing breathe. */
  visual?: CardVisual;
  className?: string;
}) {
  const { listRef, onKeyDown } = useRovingFocus();

  // Exactly one card in the group is tabbable, as a radio group should be.
  const firstEnabled = options.find((option) => !option.disabled)?.value ?? null;
  const tabbable = value ?? firstEnabled;

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("grid gap-2.5", COLUMNS[columns], className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            data-choice
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={option.value === tabbable ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            style={riseDelay(index)}
            className={cardClass(selected, layout, false)}
          >
            <CardBody option={option} selected={selected} layout={layout} visual={visual} />

            {selected ? (
              <motion.span layoutId={`choice-tick-${name}`} className={tickClass(layout)}>
                <Check className="size-3" />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Several answers — the same cards, each one switched on and off              */
/* -------------------------------------------------------------------------- */

/**
 * The same cards, for a question with several answers — which days you open.
 * Each card is a toggle button (aria-pressed) rather than a radio: tapping one
 * never touches the others. A switched-on card looks exactly like a chosen
 * ChoiceGroup card, so "on" reads the same across the product.
 *
 * The tick cannot travel here — several cards hold one at once — so it pops in
 * place. Ticks already on at the first render are simply there (no entrance in
 * the server's HTML); Motion drops the pop under reduced motion.
 */
export function ChoiceToggleGroup<T extends string>({
  label,
  options,
  values,
  onToggle,
  layout = "tile",
  columns = 4,
  visual = "bare",
  compact = false,
  className,
}: {
  label: string;
  options: readonly Choice<T>[];
  values: readonly T[];
  onToggle: (value: T) => void;
  layout?: CardLayout;
  columns?: keyof typeof COLUMNS;
  visual?: CardVisual;
  /** Tighter tiles, for a row of many small cards. */
  compact?: boolean;
  className?: string;
}) {
  const { listRef, onKeyDown } = useRovingFocus();

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("grid gap-2", COLUMNS[columns], className)}
    >
      {options.map((option, index) => {
        const selected = values.includes(option.value);

        return (
          <button
            key={option.value}
            data-choice
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onToggle(option.value)}
            style={riseDelay(index)}
            className={cardClass(selected, layout, compact)}
          >
            <CardBody option={option} selected={selected} layout={layout} visual={visual} />

            <AnimatePresence initial={false}>
              {selected ? (
                <motion.span
                  key="tick"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={tickClass(layout, compact)}
                >
                  <Check className="size-3" />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips — the same question, at the size of a setting                         */
/* -------------------------------------------------------------------------- */

/** A pressed pill. Shared with the booking filters and the field editor. */
export function chipClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-[color,background-color,border-color,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.96]",
    active
      ? "border-ink bg-ink text-ink-inverse"
      : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
  );
}

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  onClear,
  clearLabel,
  className,
}: {
  label: string;
  options: readonly { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
  /** When given, tapping the chosen pill again unsets the answer. */
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}) {
  const { listRef, onKeyDown } = useRovingFocus();

  const tabbable = value ?? options[0]?.value ?? null;

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            data-choice
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={option.value === tabbable ? 0 : -1}
            onClick={() => (selected && onClear ? onClear() : onChange(option.value))}
            className={chipClass(selected)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}

      {value !== null && onClear && clearLabel ? (
        <button
          type="button"
          onClick={onClear}
          className="text-ink-subtle hover:text-ink rounded-full px-2 text-[12.5px] underline underline-offset-4 transition-colors"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
