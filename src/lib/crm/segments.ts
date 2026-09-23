/**
 * Behavioural segments.
 *
 * Nothing here is stored: a segment is a reading of the counters that
 * client_summaries already computes, so changing a threshold changes the badges
 * on the next render instead of needing a backfill.
 *
 * The thresholds below are the defaults, documented rather than configurable —
 * a settings screen for them would cost more than it helps until a coach asks.
 */

export const SEGMENTS = ["loyal", "inactive", "top_spender"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_RULES = {
  /** Bookings over the window client_summaries counts (180 days). */
  loyalBookings: 5,
  /** No booking received for this long, having booked at least once before. */
  inactiveDays: 90,
  /** Share of the paying clients that counts as "top": the best fifth. */
  topSpenderShare: 0.2,
  /**
   * Below this many paying clients a "top 20%" is one person by construction,
   * which says nothing — so the badge stays off.
   */
  minPayingClients: 3,
} as const;

export type SegmentInput = {
  bookings_count: number;
  recent_bookings_count: number;
  last_booking_at: string | null;
  spent: number;
};

/**
 * The spend a client must reach to be in the top share of the paying ones.
 * Null when there are too few paying clients for the ranking to mean anything.
 */
export function topSpenderThreshold(spends: number[]): number | null {
  const paying = spends.filter((value) => value > 0).sort((a, b) => b - a);
  if (paying.length < SEGMENT_RULES.minPayingClients) return null;

  const cut = Math.max(1, Math.round(paying.length * SEGMENT_RULES.topSpenderShare));
  return paying[cut - 1];
}

export function segmentsFor(
  client: SegmentInput,
  options: { now?: Date; topSpenderFrom?: number | null } = {},
): Segment[] {
  const { now = new Date(), topSpenderFrom = null } = options;
  const segments: Segment[] = [];

  if (client.recent_bookings_count >= SEGMENT_RULES.loyalBookings) segments.push("loyal");

  if (client.bookings_count > 0 && client.last_booking_at) {
    const days = (now.getTime() - new Date(client.last_booking_at).getTime()) / 86_400_000;
    if (days >= SEGMENT_RULES.inactiveDays) segments.push("inactive");
  }

  if (topSpenderFrom !== null && client.spent > 0 && client.spent >= topSpenderFrom) {
    segments.push("top_spender");
  }

  return segments;
}

/** Segments for a whole list, sharing one ranking pass. */
export function segmentsByClient<T extends SegmentInput & { id: string }>(
  clients: T[],
  now = new Date(),
): Map<string, Segment[]> {
  const topSpenderFrom = topSpenderThreshold(clients.map((client) => client.spent));
  return new Map(
    clients.map((client) => [client.id, segmentsFor(client, { now, topSpenderFrom })]),
  );
}

/** Every tag used across the coach's clients, sorted, for the filter bar. */
export function tagVocabulary(clients: { tags: string[] }[]): string[] {
  const tags = new Set<string>();
  for (const client of clients) for (const tag of client.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export const TAG_LIMITS = { perClient: 20, length: 24 } as const;

/** Trims, drops empties and duplicates (case-insensitively), keeps the order. */
export function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const tag = raw.trim().slice(0, TAG_LIMITS.length);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result.slice(0, TAG_LIMITS.perClient);
}
