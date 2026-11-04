/**
 * The Statistics page's arithmetic, on top of page_stats() (SQL does the
 * counting; this only compares and words it). Pure, so every figure the coach
 * reads is tested once here.
 */

export type Totals = { views: number; clicks: number; contacts: number };

export type PageStats = {
  days: number;
  totals: Totals;
  previous: Totals;
  /** Distinct visitors at each step: visited, clicked anything, got in touch. */
  funnel: { visitors: number; clickers: number; contacters: number };
  daily: { day: string; views: number; clicks: number; contacts: number }[];
  blocks: {
    id: string;
    type: string;
    config: Record<string, unknown> | null;
    offer_title: string | null;
    clicks: number;
    contacts: number;
  }[];
  sources: { source: string; views: number; contacts: number }[];
  countries: { country: string; views: number }[];
  cities: { city: string; country: string | null; views: number }[];
  devices: { device: "mobile" | "tablet" | "desktop"; views: number }[];
  contact_kinds: { kind: string; contacts: number }[];
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: unknown): Period {
  const value = Number(raw);
  return (PERIODS as readonly number[]).includes(value) ? (value as Period) : 30;
}

/** Normalises what the database returned: numbers as numbers, lists as lists. */
export function parseStats(raw: unknown): PageStats {
  const r = (raw ?? {}) as Partial<Record<keyof PageStats, unknown>>;
  const num = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);
  const totals = (value: unknown): Totals => {
    const t = (value ?? {}) as Record<string, unknown>;
    return { views: num(t.views), clicks: num(t.clicks), contacts: num(t.contacts) };
  };
  const list = <T>(value: unknown, map: (item: Record<string, unknown>) => T): T[] =>
    Array.isArray(value) ? value.map((item) => map(item as Record<string, unknown>)) : [];

  return {
    days: num(r.days) || 30,
    totals: totals(r.totals),
    previous: totals(r.previous),
    funnel: (() => {
      const f = (r.funnel ?? {}) as Record<string, unknown>;
      return {
        visitors: num(f.visitors),
        clickers: num(f.clickers),
        contacters: num(f.contacters),
      };
    })(),
    daily: list(r.daily, (d) => ({
      day: String(d.day),
      views: num(d.views),
      clicks: num(d.clicks),
      contacts: num(d.contacts),
    })),
    blocks: list(r.blocks, (b) => ({
      id: String(b.id),
      type: String(b.type),
      config: (b.config as Record<string, unknown>) ?? null,
      offer_title: (b.offer_title as string) ?? null,
      clicks: num(b.clicks),
      contacts: num(b.contacts),
    })),
    sources: list(r.sources, (s) => ({
      source: String(s.source),
      views: num(s.views),
      contacts: num(s.contacts),
    })),
    countries: list(r.countries, (c) => ({ country: String(c.country), views: num(c.views) })),
    cities: list(r.cities, (c) => ({
      city: String(c.city),
      country: (c.country as string) ?? null,
      views: num(c.views),
    })),
    devices: list(r.devices, (d) => ({ device: d.device as "mobile", views: num(d.views) })),
    contact_kinds: list(r.contact_kinds, (k) => ({
      kind: String(k.kind),
      contacts: num(k.contacts),
    })),
  };
}

/**
 * Change against the previous period, in percent, rounded. Null when there is
 * nothing to compare with (the previous period was empty): "+∞ %" helps no one.
 */
export function variation(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** A share in percent, rounded, or null when the base is empty. */
export function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function isEmpty(stats: PageStats): boolean {
  return stats.totals.views + stats.totals.clicks + stats.totals.contacts === 0;
}

export type Insight =
  | { key: "topSource"; source: string; share: number }
  | { key: "visitsUp"; change: number }
  | { key: "visitsDown"; change: number }
  | { key: "topBlock"; blockId: string; clicks: number }
  /** Share of visitors who got in touch. */
  | { key: "contactRate"; rate: number }
  | { key: "firstVisits"; views: number };

/**
 * One factual sentence, chosen in order of usefulness: where visits come from
 * (when one source clearly leads), a marked change, the block that works, the
 * share of visits that become contacts. Only facts read off the period — no
 * forecast, no promise. Small numbers get no percentage: "100 % of 2 visits"
 * says nothing.
 */
export function insight(stats: PageStats): Insight | null {
  const { totals, previous } = stats;
  if (totals.views === 0 && totals.clicks === 0) return null;

  if (totals.views >= 10) {
    const top = [...stats.sources].sort((a, b) => b.views - a.views)[0];
    const share = top ? rate(top.views, totals.views) : null;
    if (top && share !== null && share >= 40)
      return { key: "topSource", source: top.source, share };
  }

  const change = variation(totals.views, previous.views);
  if (change !== null && previous.views >= 10 && Math.abs(change) >= 20) {
    return change > 0
      ? { key: "visitsUp", change }
      : { key: "visitsDown", change: Math.abs(change) };
  }

  const block = stats.blocks[0];
  if (block && block.clicks >= 3)
    return { key: "topBlock", blockId: block.id, clicks: block.clicks };

  const contactRate = rate(stats.funnel.contacters, stats.funnel.visitors);
  if (stats.funnel.visitors >= 20 && contactRate !== null && stats.funnel.contacters > 0) {
    return { key: "contactRate", rate: contactRate };
  }

  return { key: "firstVisits", views: totals.views };
}
