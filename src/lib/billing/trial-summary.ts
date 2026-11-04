/**
 * What the page brought during the trial, as trial_summary() returns it, made
 * safe to show: numbers as numbers, and "nothing yet" told apart, so the
 * subscription screen never shows a row of zeros.
 */
export type TrialFigures = { views?: unknown; clicks?: unknown; contacts?: unknown };

export type TrialSummaryView =
  { kind: "empty" } | { kind: "figures"; views: number; clicks: number; contacts: number };

const count = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

export function summarizeTrial(figures: TrialFigures | null | undefined): TrialSummaryView {
  const views = count(figures?.views);
  const clicks = count(figures?.clicks);
  const contacts = count(figures?.contacts);
  if (views + clicks + contacts === 0) return { kind: "empty" };
  return { kind: "figures", views, clicks, contacts };
}
