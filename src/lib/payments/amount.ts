/**
 * Turning an offer's price into an amount a gateway will accept.
 *
 * Money is handled in minor units everywhere past this file: payment APIs take
 * integers, and a price that has been through a float is a price that will one
 * day be off by a cent.
 */

/** Currencies a gateway expects as whole units — there is no "0.5 yen". */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * minorUnitFactor(currency));
}

export function fromMinorUnits(amountCents: number, currency: string): number {
  return amountCents / minorUnitFactor(currency);
}

/** The string PayPal wants: "12.00", or "1200" for a zero-decimal currency. */
export function decimalString(amountCents: number, currency: string): string {
  const factor = minorUnitFactor(currency);
  if (factor === 1) return String(amountCents);
  return (amountCents / factor).toFixed(2);
}

export type PayableOffer = {
  price: number | null;
  /** Plain string: this is read straight off a database row. */
  price_type: string;
};

/**
 * Online payment only makes sense when the amount is not up for discussion.
 *
 * "From 50 €" and "on request" are conversations, not transactions: the final
 * price is agreed later, so there is nothing to charge at booking time.
 */
export function offerIsPayable(offer: PayableOffer): boolean {
  return offer.price_type === "fixed" && typeof offer.price === "number" && offer.price > 0;
}

/**
 * What the client owes, in minor units, or null when the offer cannot be paid
 * online. Quantity multiplies: three tickets are three times the price.
 */
export function chargeableAmount(
  offer: PayableOffer,
  currency: string,
  quantity = 1,
): number | null {
  if (!offerIsPayable(offer)) return null;
  const units = Math.max(1, Math.floor(quantity));
  return toMinorUnits(offer.price! * units, currency);
}

/** For display: "45,00 €" in the reader's language. */
export function formatAmount(amountCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
  }).format(fromMinorUnits(amountCents, currency));
}
