"use client";

import { CreditCard, Store, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatAmount } from "@/lib/payments/amount";
import { cn } from "@/lib/utils";

export type PaymentOption = "stripe" | "paypal" | "on_site";

/**
 * The step between choosing a slot and confirming: how the client pays.
 *
 * Shown only when the coach has a gateway connected and the offer asks for
 * payment. The amount is stated once, plainly, above the choices — a client
 * should never reach a provider's page to find out what they are about to be
 * charged.
 */
export function PaymentChoice({
  amountCents,
  currency,
  locale,
  providers,
  allowOnSite,
  value,
  onChange,
  error,
}: {
  amountCents: number;
  currency: string;
  locale: string;
  providers: ("stripe" | "paypal")[];
  /** The offer lets the client settle with the coach in person instead. */
  allowOnSite: boolean;
  value: PaymentOption | null;
  onChange: (value: PaymentOption) => void;
  error?: string | null;
}) {
  const t = useTranslations("publicProfile.payment");

  const options: { key: PaymentOption; icon: typeof CreditCard }[] = [
    ...providers.map((provider) => ({
      key: provider as PaymentOption,
      icon: provider === "stripe" ? CreditCard : Wallet,
    })),
    ...(allowOnSite ? [{ key: "on_site" as const, icon: Store }] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-ink text-[13px] font-medium">{t("title")}</p>
        <p className="text-ink text-[16px] font-semibold tabular-nums">
          {formatAmount(amountCents, currency, locale)}
        </p>
      </div>

      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option.key;
          const Icon = option.icon;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-line-strong hover:border-ink/25",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  selected
                    ? "bg-[var(--accent)] text-[var(--accent-on)]"
                    : "bg-ink/[0.04] text-ink",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="text-ink block text-[14px] font-medium">
                  {t(`options.${option.key}.label` as "options.stripe.label")}
                </span>
                <span className="text-ink-muted block text-[12.5px] leading-relaxed">
                  {t(`options.${option.key}.hint` as "options.stripe.hint")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="text-danger text-[13px]">{error}</p> : null}

      <p className="text-ink-subtle text-[12px] leading-relaxed">{t("securityNote")}</p>
    </div>
  );
}
