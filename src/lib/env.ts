/**
 * Environment access in one place.
 * Client-safe values must be read as literal `process.env.NEXT_PUBLIC_*`
 * member expressions so the bundler can inline them.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export function assertSupabasePublicEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}

/** Server-only secrets. Never import these from a client component. */
export const serverEnv = {
  get supabaseSecretKey() {
    return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "TheSessionLink <onboarding@resend.dev>";
  },
  get emailReplyTo() {
    return process.env.EMAIL_REPLY_TO ?? "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
};

export const isEmailConfigured = () => Boolean(serverEnv.resendApiKey);

/**
 * The address a human can write to, fit for a mailto: link.
 *
 * EMAIL_FROM carries a display name ("TheSessionLink <hello@…>"), which is what
 * Resend wants and what a mailto: link must not contain — the angle brackets
 * and the space break the URL. This returns the bare address, whichever of the
 * two variables it comes from.
 */
export function supportAddress(): string | null {
  const raw = serverEnv.emailReplyTo || serverEnv.emailFrom;
  const inBrackets = raw.match(/<([^>]+)>/);
  const address = (inBrackets ? inBrackets[1] : raw).trim();
  return address.includes("@") ? address : null;
}
