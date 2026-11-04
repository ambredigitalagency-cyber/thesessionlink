/**
 * The stops every numeric slider moves through, in one place.
 *
 * Each scale is dense where people actually pick and sparse where they rarely
 * go: a price is euro by euro up to a hundred, then coarser; a duration detail
 * is five minutes at a time for the first hour, then longer steps. Every stop
 * stays inside what the matching zod schema accepts (src/lib/offers/fields.ts,
 * validation.ts).
 */

/** Evenly spaced stops, the building block of the scales below. */
export function steps(from: number, to: number, by: number): number[] {
  const list: number[] = [];
  for (let value = from; value <= to + 1e-9; value += by) list.push(Math.round(value * 100) / 100);
  return list;
}

/**
 * Offer prices. 1 € steps up to 100, 5 € to 500, 50 € to 2 000. Anything else
 * — cents, a 12 000 € package — goes through the exact input beside it.
 */
export const PRICE_STOPS = [...steps(0, 100, 1), ...steps(105, 500, 5), ...steps(550, 2000, 50)];

/** Duration details on offers (time field, "duration" mode) — up to a week. */
export const DETAIL_DURATION_STOPS = [
  ...steps(5, 60, 5),
  ...steps(75, 240, 15),
  ...steps(270, 480, 30),
  ...steps(540, 1440, 60),
  ...steps(2880, 10080, 1440),
];
