import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The pure half of the console's password access: comparing a password and
 * signing / checking the access cookie. No request, no cookie store, so it is
 * tested directly (password-token.test.ts). The wiring lives in
 * ./password-access.ts.
 *
 * The cookie value is `<expires-at-seconds>.<signature>`. The signature is an
 * HMAC of the expiry, keyed with the password AND the server secret:
 *
 *   * the password, so changing ADMIN_ACCESS_PASSWORD invalidates every cookie
 *     already handed out — the whole revocation story;
 *   * the server secret, so a leaked cookie cannot be used to brute-force the
 *     password offline: without the secret, guessing the password does not
 *     reproduce the signature.
 *
 * The expiry is inside the signed value, so it is enforced by the server even
 * if a browser keeps the cookie past its Max-Age.
 */

/** Seven days, as asked. */
export const ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Below this, the feature stays off: a short password is a guessable one. */
export const MIN_PASSWORD_LENGTH = 12;

function key(password: string, secret: string): Buffer {
  return createHash("sha256").update(`tsl-console:${password}:${secret}`).digest();
}

function sign(expiresAt: number, password: string, secret: string): string {
  return createHmac("sha256", key(password, secret))
    .update(`admin-console:${expiresAt}`)
    .digest("base64url");
}

/** Constant-time on the digests, so neither length nor prefix leaks. */
export function passwordMatches(given: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function issueAccessToken(
  password: string,
  secret: string,
  now: Date = new Date(),
): { value: string; expiresAt: Date } {
  const expiresAt = Math.floor(now.getTime() / 1000) + ACCESS_TTL_SECONDS;
  return {
    value: `${expiresAt}.${sign(expiresAt, password, secret)}`,
    expiresAt: new Date(expiresAt * 1000),
  };
}

export function accessTokenIsValid(
  value: string | undefined,
  password: string,
  secret: string,
  now: Date = new Date(),
): boolean {
  if (!value || !password || !secret) return false;

  const separator = value.indexOf(".");
  if (separator <= 0) return false;

  const expiresAt = Number(value.slice(0, separator));
  if (!Number.isInteger(expiresAt)) return false;
  if (expiresAt * 1000 <= now.getTime()) return false;

  const provided = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(expiresAt, password, secret));
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
