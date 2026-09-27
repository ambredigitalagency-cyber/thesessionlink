import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { readPaddleEvent, subscriptionIsActive, verifyPaddleSignature } from "./paddle-core";

const SECRET = "pdl_ntfset_test_secret";
const NOW = 1_800_000_000_000;
const TS = Math.floor(NOW / 1000);

function sign(body: string, ts = TS, secret = SECRET) {
  return createHmac("sha256", secret).update(`${ts}:${body}`, "utf8").digest("hex");
}

describe("verifyPaddleSignature", () => {
  const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created" });

  it("accepts a correctly signed, fresh delivery", () => {
    expect(verifyPaddleSignature(body, `ts=${TS};h1=${sign(body)}`, SECRET, 300, NOW)).toBe(true);
  });

  it("accepts any of several h1 during a secret rotation", () => {
    const header = `ts=${TS};h1=${sign(body, TS, "old_secret")};h1=${sign(body)}`;
    expect(verifyPaddleSignature(body, header, SECRET, 300, NOW)).toBe(true);
  });

  it("refuses a tampered body, another secret, a stale timestamp, garbage", () => {
    expect(verifyPaddleSignature(`${body} `, `ts=${TS};h1=${sign(body)}`, SECRET, 300, NOW)).toBe(
      false,
    );
    expect(
      verifyPaddleSignature(body, `ts=${TS};h1=${sign(body, TS, "other")}`, SECRET, 300, NOW),
    ).toBe(false);
    const old = TS - 3600;
    expect(verifyPaddleSignature(body, `ts=${old};h1=${sign(body, old)}`, SECRET, 300, NOW)).toBe(
      false,
    );
    for (const header of [null, "", "ts=abc;h1=00", `h1=${sign(body)}`, `ts=${TS}`]) {
      expect(verifyPaddleSignature(body, header, SECRET, 300, NOW)).toBe(false);
    }
    expect(verifyPaddleSignature(body, `ts=${TS};h1=${sign(body)}`, "", 300, NOW)).toBe(false);
  });
});

describe("readPaddleEvent", () => {
  const profileId = "0c7424aa-1111-4222-8333-444455556666";

  it("reads a subscription event", () => {
    const facts = readPaddleEvent({
      event_id: "evt_01",
      event_type: "subscription.created",
      occurred_at: "2026-09-27T10:00:00Z",
      data: {
        id: "sub_01",
        status: "trialing",
        customer_id: "ctm_01",
        custom_data: { profile_id: profileId },
        next_billed_at: "2026-10-11T10:00:00Z",
      },
    });
    expect(facts).toEqual({
      eventId: "evt_01",
      eventType: "subscription.created",
      occurredAt: "2026-09-27T10:00:00Z",
      profileId,
      customerId: "ctm_01",
      subscriptionId: "sub_01",
      status: "trialing",
      renewsAt: "2026-10-11T10:00:00Z",
    });
  });

  it("reads a transaction and its subscription link", () => {
    const facts = readPaddleEvent({
      event_id: "evt_02",
      event_type: "transaction.completed",
      occurred_at: "2026-09-27T10:00:01Z",
      data: {
        id: "txn_01",
        customer_id: "ctm_01",
        subscription_id: "sub_01",
        custom_data: { profile_id: profileId },
      },
    });
    expect(facts?.subscriptionId).toBe("sub_01");
    expect(facts?.status).toBeNull();
  });

  it("ignores other events and refuses a bogus profile id", () => {
    expect(
      readPaddleEvent({
        event_id: "e",
        event_type: "customer.created",
        occurred_at: "x",
        data: {},
      }),
    ).toBeNull();
    const facts = readPaddleEvent({
      event_id: "evt_03",
      event_type: "subscription.updated",
      occurred_at: "2026-09-27T10:00:00Z",
      data: {
        id: "sub_01",
        status: "active",
        custom_data: { profile_id: "'; drop table profiles; --" },
      },
    });
    expect(facts?.profileId).toBeNull();
    expect(
      readPaddleEvent({
        event_id: "e",
        event_type: "subscription.updated",
        occurred_at: "x",
        data: { status: "weird" },
      }),
    ).toBeNull();
  });
});

describe("subscriptionIsActive", () => {
  it("counts trialing, active and past_due, not paused or canceled", () => {
    expect(
      ["trialing", "active", "past_due"].every((s) => subscriptionIsActive(s as "active")),
    ).toBe(true);
    expect(subscriptionIsActive("paused")).toBe(false);
    expect(subscriptionIsActive("canceled")).toBe(false);
    expect(subscriptionIsActive(null)).toBe(false);
  });
});
