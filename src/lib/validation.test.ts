import { describe, expect, it } from "vitest";

import { settingsSchema } from "./validation";

/**
 * A WhatsApp number reaches a column that only accepts a leading plus and
 * digits. People type spaces. Both facts are permanent, so the normalisation
 * between them is worth pinning down: before it existed, "+212 6 11 22 33 44"
 * passed validation and was refused by Postgres, which the coach saw as an
 * unexplained failure.
 */
const base = {
  contact_email: null,
  phone_number: null,
  contact_channels: { email: true, phone: false, whatsapp: true },
  locale: "fr",
  timezone: "Africa/Casablanca",
  currency: "EUR",
  reminder_hours_before: 24,
  notify_new_bookings: true,
};

const whatsapp = (value: string | null) =>
  settingsSchema.safeParse({ ...base, whatsapp_number: value });

describe("whatsapp number", () => {
  it("keeps what the column accepts", () => {
    expect(whatsapp("+212611223344").data?.whatsapp_number).toBe("+212611223344");
    expect(whatsapp("0612345678").data?.whatsapp_number).toBe("0612345678");
  });

  it("strips the punctuation people type", () => {
    for (const typed of [
      "+212 6 11 22 33 44",
      "+212-611-223-344",
      "+212 (6) 11.22.33.44",
      "  +212 611 223 344  ",
    ]) {
      expect(whatsapp(typed).data?.whatsapp_number, typed).toBe("+212611223344");
    }
  });

  it("keeps a plus only at the front", () => {
    expect(whatsapp("+212+611223344").data?.whatsapp_number).toBe("+212611223344");
    expect(whatsapp("212+611223344").data?.whatsapp_number).toBe("212611223344");
  });

  it("treats an empty answer as no answer", () => {
    expect(whatsapp("").data?.whatsapp_number).toBeNull();
    expect(whatsapp(null).data?.whatsapp_number).toBeNull();
    expect(whatsapp("   ").data?.whatsapp_number).toBeNull();
  });

  it("still refuses what the column would refuse", () => {
    expect(whatsapp("12345").success).toBe(false); // too short
    expect(whatsapp("+" + "1".repeat(21)).success).toBe(false); // too long
    expect(whatsapp("not a number").success).toBe(false);
  });
});
