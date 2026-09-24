import { afterEach, describe, expect, it, vi } from "vitest";

import { supportAddress } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supportAddress", () => {
  it("strips the display name EMAIL_FROM carries, which mailto: cannot take", () => {
    vi.stubEnv("EMAIL_REPLY_TO", "");
    vi.stubEnv("EMAIL_FROM", "TheSessionLink <hello@thesessionlink.com>");
    expect(supportAddress()).toBe("hello@thesessionlink.com");
  });

  it("takes a bare address as it is, and prefers the reply-to", () => {
    vi.stubEnv("EMAIL_REPLY_TO", "support@thesessionlink.com");
    vi.stubEnv("EMAIL_FROM", "TheSessionLink <hello@thesessionlink.com>");
    expect(supportAddress()).toBe("support@thesessionlink.com");
  });

  it("returns null rather than a broken link when nothing looks like an address", () => {
    vi.stubEnv("EMAIL_REPLY_TO", "");
    vi.stubEnv("EMAIL_FROM", "TheSessionLink");
    expect(supportAddress()).toBeNull();
  });
});
