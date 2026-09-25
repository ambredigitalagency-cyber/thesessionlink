"use client";

import { useTranslations } from "next-intl";
import { Label } from "radix-ui";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const FieldContext = createContext<{ id: string; invalid: boolean } | null>(null);

function useFieldContext() {
  return use(FieldContext);
}

type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, wired with matching ids and aria attributes. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const t = useTranslations("common");
  const id = useId();
  const invalid = Boolean(error);

  return (
    <FieldContext value={{ id, invalid }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label ? (
          <div className="flex items-baseline justify-between gap-3">
            <Label.Root htmlFor={id} className="text-ink text-[13px] font-medium">
              {label}
            </Label.Root>
            {optional ? (
              <span className="text-ink-subtle text-[11px] tracking-wide uppercase">
                {t("optional")}
              </span>
            ) : null}
          </div>
        ) : null}
        {children}
        {error ? (
          <p id={`${id}-error`} className="text-danger text-[13px]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-ink-muted text-[13px] leading-snug">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext>
  );
}

const controlClass =
  "w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-subtle transition-colors duration-150 hover:border-ink/20 focus:border-ink focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-muted aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  const field = useFieldContext();

  return (
    <input
      id={props.id ?? field?.id}
      aria-invalid={props["aria-invalid"] ?? field?.invalid ?? undefined}
      className={cn(controlClass, "h-11 py-0", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field = useFieldContext();

  return (
    <textarea
      id={props.id ?? field?.id}
      aria-invalid={props["aria-invalid"] ?? field?.invalid ?? undefined}
      className={cn(controlClass, "min-h-28 resize-y leading-relaxed", className)}
      {...props}
    />
  );
}

/** Native select, styled to match. Used where a listbox would be overkill. */
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  const field = useFieldContext();

  return (
    <div className="relative">
      <select
        id={props.id ?? field?.id}
        aria-invalid={props["aria-invalid"] ?? field?.invalid ?? undefined}
        className={cn(controlClass, "h-11 appearance-none py-0 pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="text-ink-subtle pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * Input with a fixed prefix, e.g. thesessionlink.com/
 *
 * `size="lg"` is for the moments where the field *is* the screen — picking
 * your public link during onboarding — rather than one row in a form.
 */
export function PrefixedInput({
  prefix,
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<"input">, "size"> & { prefix: string; size?: "md" | "lg" }) {
  const field = useFieldContext();
  const large = size === "lg";

  return (
    <div
      className={cn(
        "border-line-strong bg-surface focus-within:border-ink flex items-center border transition-colors",
        large
          ? "h-14 rounded-[var(--radius-md)] pl-4 text-[18px]"
          : "h-11 rounded-[var(--radius-sm)] pl-3.5 text-[15px]",
        field?.invalid && "border-danger",
      )}
    >
      <span className="text-ink-subtle shrink-0 text-[1em]">{prefix}</span>
      <input
        id={props.id ?? field?.id}
        aria-invalid={field?.invalid || undefined}
        className={cn(
          "text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent pr-3.5 text-[1em] focus:outline-none",
          large ? "pr-10" : "",
          className,
        )}
        {...props}
      />
    </div>
  );
}
