/**
 * A coach's short reference: "#7A3F2C", the first six hex digits of the
 * profile id, uppercased.
 *
 * Derived rather than stored, so every existing coach has one already and it
 * can never drift from the row it names. Six hex digits is sixteen million
 * values: a collision is theoretical at this platform's size, and the console
 * only uses the reference to find and quote an account, never as a key.
 */
export function coachRef(profileId: string): string {
  return `#${profileId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Whether a search box entry ("#7a3f", "7A3F2C") points at this reference. */
export function matchesRef(profileId: string, search: string): boolean {
  const needle = search.trim().replace(/^#/, "").toUpperCase();
  return needle.length >= 3 && coachRef(profileId).slice(1).startsWith(needle);
}
