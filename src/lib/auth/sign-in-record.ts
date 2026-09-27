/**
 * The pure half of the sign-in history (coach_sign_ins): what gets stored, and
 * how little. Tested in sign-in-record.test.ts; the write lives in
 * ./record-sign-in.ts.
 *
 * Nothing here identifies a person on its own: the device is a family name
 * ("Chrome · Windows"), never the full user-agent string, and the address is
 * cut to its network so it says "same place as usual", not "this house".
 */

export type SignInMethod = "magic_link" | "google" | "other";

/**
 * How the session was obtained, from the `amr` claim Supabase puts in the
 * access token: "oauth" for a provider (Google is the only one), "otp" or
 * "magiclink" for the emailed link.
 */
export function methodFromAccessToken(token: string | undefined): SignInMethod {
  try {
    const payload = JSON.parse(
      Buffer.from((token ?? "").split(".")[1] ?? "", "base64url").toString(),
    );
    const method = Array.isArray(payload.amr) ? payload.amr[0]?.method : undefined;
    if (method === "oauth") return "google";
    if (method === "otp" || method === "magiclink" || method === "email/signup")
      return "magic_link";
    return "other";
  } catch {
    return "other";
  }
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

/** "Chrome · Windows", "Safari · iOS", or null when nothing is recognised. */
export function describeDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const parts = [browser, system].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** 203.0.113.7 → 203.0.113.0/24 · 2001:db8:85a3:8d3::1 → 2001:db8:85a3::/48. */
export function ipPrefix(address: string | null | undefined): string | null {
  const ip = address?.split(",")[0]?.trim();
  if (!ip) return null;

  const v4 = ip.replace(/^::ffff:/, "").match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;

  if (ip.includes(":")) {
    const groups = ip.split("::")[0].split(":").filter(Boolean).slice(0, 3);
    if (groups.length === 0) return null;
    return `${groups.join(":")}::/48`;
  }
  return null;
}
