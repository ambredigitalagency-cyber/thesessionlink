"use client";

import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useId, useMemo } from "react";

import { COUNTRIES, type CountryCode } from "@/lib/onboarding/config";
import { cn } from "@/lib/utils";

/** "MA" → 🇲🇦, from the two regional-indicator letters. */
function flag(code: string) {
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}

/**
 * A phone number with its country: a native select for the dialling code —
 * the one control every phone already knows how to make comfortable — and
 * the number beside it. The country's name is read out with its code; the
 * flag is decoration.
 */
export function PhoneField({
  country,
  onCountryChange,
  number,
  onNumberChange,
  label,
  countryLabel,
  hint,
  error,
  placeholder,
  autoFocus,
}: {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  number: string;
  onNumberChange: (number: string) => void;
  label: string;
  countryLabel: string;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const locale = useLocale();
  const id = useId();
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);
  const dial = COUNTRIES.find((entry) => entry.code === country)?.dial ?? "";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-number`} className="text-ink text-[13px] font-medium">
        {label}
      </label>
      <div
        className={cn(
          "border-line-strong bg-surface focus-within:border-ink flex h-12 items-stretch overflow-hidden rounded-[var(--radius-sm)] border transition-colors",
          error && "border-danger",
        )}
      >
        <div className="border-line relative flex shrink-0 items-center border-r">
          <span
            aria-hidden
            className="pointer-events-none flex items-center gap-1.5 pr-7 pl-3 text-[15px]"
          >
            <span className="text-[17px] leading-none">{flag(country)}</span>
            <span className="text-ink font-medium tabular-nums">+{dial}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="text-ink-subtle pointer-events-none absolute right-2 size-3.5"
          />
          <select
            aria-label={countryLabel}
            value={country}
            onChange={(event) => onCountryChange(event.target.value as CountryCode)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {COUNTRIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {`${names?.of(entry.code) ?? entry.code} (+${entry.dial})`}
              </option>
            ))}
          </select>
        </div>
        <input
          id={`${id}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-help`}
          autoFocus={autoFocus}
          maxLength={30}
          className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent px-3.5 text-[16px] tabular-nums focus:outline-none"
        />
      </div>
      <p id={`${id}-help`} className={cn("text-[13px]", error ? "text-danger" : "text-ink-muted")}>
        {error ?? hint}
      </p>
    </div>
  );
}
