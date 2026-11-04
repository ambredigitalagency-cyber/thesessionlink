import { COUNTRIES, type CountryCode } from "./config";

/**
 * A phone number as typed — "06 12 34 56 78", "+33 6…", "0033 6…" — into the
 * international form WhatsApp and phones need: "+212612345678".
 *
 * The country picked beside the field only matters when the number does not
 * already say where it is from. The national trunk zero goes (06… in Morocco
 * or France is 6… once the country code is in front). The result must look
 * like an E.164 number: a "+", a country code that does not start with 0, and
 * 8 to 15 digits in all. Whether it is actually in service, nobody can tell.
 */

export const E164 = /^\+[1-9]\d{7,14}$/;

export function dialCode(country: string): string | null {
  return COUNTRIES.find((entry) => entry.code === country)?.dial ?? null;
}

export function internationalNumber(country: CountryCode | string, input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 30) return null;
  // Letters are never part of a number: refuse rather than strip them.
  if (/[^\d\s+().-]/.test(raw)) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  let number: string;
  if (digits.startsWith("+")) {
    number = `+${digits.slice(1).replace(/\+/g, "")}`;
  } else {
    const dial = dialCode(country);
    if (!dial) return null;
    const national = digits.replace(/\+/g, "").replace(/^0+/, "");
    if (national.length < 6) return null;
    number = `+${dial}${national}`;
  }

  return E164.test(number) ? number : null;
}
