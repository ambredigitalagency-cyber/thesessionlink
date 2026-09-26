import { describe, expect, it } from "vitest";

import { coachActivity, paymentSummary, profileCompleteness } from "./coach-file";
import { coachRef, matchesRef } from "./ref";

const NOW = new Date("2026-09-26T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("coachRef", () => {
  it("is the first six hex digits, uppercased", () => {
    expect(coachRef("7a3f2c91-0b4d-4e8a-9f11-2c3d4e5f6a7b")).toBe("#7A3F2C");
  });

  it("matches a search with or without the hash, from three characters", () => {
    const id = "7a3f2c91-0b4d-4e8a-9f11-2c3d4e5f6a7b";
    expect(matchesRef(id, "#7a3f")).toBe(true);
    expect(matchesRef(id, "7A3F2C")).toBe(true);
    expect(matchesRef(id, "7a")).toBe(false);
    expect(matchesRef(id, "7a4")).toBe(false);
  });
});

describe("coachActivity", () => {
  const booking = (patch: Partial<Parameters<typeof coachActivity>[0][number]>) => ({
    status: "confirmed" as const,
    no_show: false,
    created_at: daysAgo(5),
    starts_at: daysAgo(2),
    client_email: "a@example.com",
    ...patch,
  });

  it("counts recent bookings, distinct clients and past sessions", () => {
    const activity = coachActivity(
      [
        booking({}),
        booking({ client_email: "A@example.com", no_show: true }),
        booking({ client_email: "b@example.com", created_at: daysAgo(40), starts_at: daysAgo(38) }),
        booking({ client_email: "c@example.com", status: "cancelled" }),
        // Upcoming: not a past session.
        booking({
          client_email: "d@example.com",
          starts_at: new Date(NOW.getTime() + 86_400_000).toISOString(),
        }),
      ],
      NOW,
    );

    expect(activity.recentBookings).toBe(4);
    expect(activity.clients).toBe(4);
    expect(activity.pastSessions).toBe(3);
    expect(activity.noShowRate).toBeCloseTo(1 / 3);
    expect(activity.cancelRate).toBeCloseTo(1 / 5);
  });

  it("has no rates without data", () => {
    const activity = coachActivity([], NOW);
    expect(activity.noShowRate).toBeNull();
    expect(activity.cancelRate).toBeNull();
  });
});

describe("profileCompleteness", () => {
  it("lists what is missing in page order", () => {
    const result = profileCompleteness({
      avatar_url: "https://example.com/a.webp",
      headline: " ",
      bio: "Hello",
      location: null,
      phone_number: null,
      whatsapp_number: "+33600000000",
      social_links: { instagram: null },
      custom_fields: [],
      activeOffers: 0,
    });

    expect(result.missing).toEqual(["headline", "location", "socials", "details", "offer"]);
    expect(result.ratio).toBeCloseTo(3 / 8);
  });
});

describe("paymentSummary", () => {
  it("sums what was paid, per currency", () => {
    const summary = paymentSummary([
      { status: "paid", amount_cents: 5500, currency: "EUR" },
      { status: "paid", amount_cents: 2800, currency: "EUR" },
      { status: "refunded", amount_cents: 2800, currency: "EUR" },
      { status: "failed", amount_cents: 1000, currency: "EUR" },
      { status: "paid", amount_cents: 4000, currency: "MAD" },
    ]);

    expect(summary.paidCount).toBe(3);
    expect(summary.refundedCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.collected).toEqual([
      { currency: "EUR", cents: 8300 },
      { currency: "MAD", cents: 4000 },
    ]);
  });
});
