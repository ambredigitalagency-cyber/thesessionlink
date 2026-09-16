/** Only ever redirect to a path inside the app (never an absolute URL). */
export function safeNextPath(value: string | null | undefined, fallback = "/onboarding") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
