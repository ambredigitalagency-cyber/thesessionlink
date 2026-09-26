/**
 * What the console's coach page reads off the rows it loads: recent activity,
 * how complete the public page is, and what has been paid through it.
 *
 * Pure, so the figures are tested once here rather than eyeballed on screen.
 */

const DAY = 86_400_000;

export type ActivityBooking = {
  status: "pending" | "confirmed" | "cancelled";
  no_show: boolean;
  created_at: string;
  starts_at: string | null;
  client_email: string;
};

export type Activity = {
  /** Received over the last 30 days, whatever became of them. */
  recentBookings: number;
  /** Distinct clients across every booking ever received. */
  clients: number;
  /** Past sessions over the last 90 days that were held or missed. */
  pastSessions: number;
  /** Share of those the client missed, 0–1; null when there are none. */
  noShowRate: number | null;
  /** Share of the last 90 days' bookings that were cancelled, 0–1. */
  cancelRate: number | null;
};

export function coachActivity(bookings: ActivityBooking[], now: Date): Activity {
  const since30 = now.getTime() - 30 * DAY;
  const since90 = now.getTime() - 90 * DAY;

  const recent = bookings.filter((booking) => new Date(booking.created_at).getTime() >= since30);
  const quarter = bookings.filter((booking) => new Date(booking.created_at).getTime() >= since90);

  const past = bookings.filter((booking) => {
    if (!booking.starts_at || booking.status !== "confirmed") return false;
    const start = new Date(booking.starts_at).getTime();
    return start >= since90 && start < now.getTime();
  });

  return {
    recentBookings: recent.length,
    clients: new Set(bookings.map((booking) => booking.client_email.toLowerCase())).size,
    pastSessions: past.length,
    noShowRate: past.length ? past.filter((booking) => booking.no_show).length / past.length : null,
    cancelRate: quarter.length
      ? quarter.filter((booking) => booking.status === "cancelled").length / quarter.length
      : null,
  };
}

export const COMPLETENESS_ITEMS = [
  "photo",
  "headline",
  "bio",
  "location",
  "contact",
  "socials",
  "details",
  "offer",
] as const;
export type CompletenessItem = (typeof COMPLETENESS_ITEMS)[number];

export type CompletenessInput = {
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  social_links: unknown;
  custom_fields: unknown;
  activeOffers: number;
};

/** Which parts of the public page are filled, in the order they appear on it. */
export function profileCompleteness(profile: CompletenessInput): {
  done: CompletenessItem[];
  missing: CompletenessItem[];
  ratio: number;
} {
  const socials =
    profile.social_links && typeof profile.social_links === "object"
      ? Object.values(profile.social_links as Record<string, unknown>).some(Boolean)
      : false;

  const filled: Record<CompletenessItem, boolean> = {
    photo: Boolean(profile.avatar_url),
    headline: Boolean(profile.headline?.trim()),
    bio: Boolean(profile.bio?.trim()),
    location: Boolean(profile.location?.trim()),
    contact: Boolean(profile.phone_number || profile.whatsapp_number),
    socials,
    details: Array.isArray(profile.custom_fields) && profile.custom_fields.length > 0,
    offer: profile.activeOffers > 0,
  };

  const done = COMPLETENESS_ITEMS.filter((item) => filled[item]);
  return {
    done,
    missing: COMPLETENESS_ITEMS.filter((item) => !filled[item]),
    ratio: done.length / COMPLETENESS_ITEMS.length,
  };
}

export type PaymentRow = {
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  amount_cents: number;
  currency: string;
};

/** Money actually collected online, per currency, plus refunds and failures. */
export function paymentSummary(payments: PaymentRow[]) {
  const collected = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    collected.set(payment.currency, (collected.get(payment.currency) ?? 0) + payment.amount_cents);
  }

  return {
    paidCount: payments.filter((payment) => payment.status === "paid").length,
    refundedCount: payments.filter((payment) => payment.status === "refunded").length,
    failedCount: payments.filter((payment) => payment.status === "failed").length,
    collected: [...collected.entries()].map(([currency, cents]) => ({ currency, cents })),
  };
}
