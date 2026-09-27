import { describe, expect, it } from "vitest";

import {
  ACCESS_TTL_SECONDS,
  accessTokenIsValid,
  issueAccessToken,
  passwordMatches,
} from "./password-token";

const PASSWORD = "correct-horse-battery";
const SECRET = "server-secret";
const NOW = new Date("2026-09-27T10:00:00Z");

describe("passwordMatches", () => {
  it("accepts the exact password only", () => {
    expect(passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(passwordMatches("correct-horse-batter", PASSWORD)).toBe(false);
    expect(passwordMatches(`${PASSWORD} `, PASSWORD)).toBe(false);
  });

  it("refuses everything when no password is configured", () => {
    expect(passwordMatches("", "")).toBe(false);
  });
});

describe("access token", () => {
  it("is valid until it expires, seven days later", () => {
    const { value, expiresAt } = issueAccessToken(PASSWORD, SECRET, NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(ACCESS_TTL_SECONDS * 1000);

    const justBefore = new Date(expiresAt.getTime() - 1000);
    expect(accessTokenIsValid(value, PASSWORD, SECRET, justBefore)).toBe(true);
    expect(accessTokenIsValid(value, PASSWORD, SECRET, expiresAt)).toBe(false);
  });

  it("dies when the password changes", () => {
    const { value } = issueAccessToken(PASSWORD, SECRET, NOW);
    expect(accessTokenIsValid(value, "another-password-123", SECRET, NOW)).toBe(false);
  });

  it("dies when the server secret changes", () => {
    const { value } = issueAccessToken(PASSWORD, SECRET, NOW);
    expect(accessTokenIsValid(value, PASSWORD, "rotated-secret", NOW)).toBe(false);
  });

  it("cannot be extended by editing the expiry", () => {
    const { value } = issueAccessToken(PASSWORD, SECRET, NOW);
    const [expiry, signature] = value.split(".");
    const forged = `${Number(expiry) + 86_400}.${signature}`;
    expect(accessTokenIsValid(forged, PASSWORD, SECRET, NOW)).toBe(false);
  });

  it("rejects garbage", () => {
    for (const value of [undefined, "", "abc", ".sig", "123.", "12.3.4", "NaN.x"]) {
      expect(accessTokenIsValid(value, PASSWORD, SECRET, NOW)).toBe(false);
    }
  });
});
