/**
 * The coach's own words in a reminder.
 *
 * Three tokens, the only three that change from one booking to the next:
 * who, what, when. They are written in braces — {client}, {offer}, {time} —
 * in whatever language the coach writes the rest in. A brace that is not one
 * of the three is left as typed, so a stray "{" never swallows a sentence.
 */

export const REMINDER_TOKENS = ["client", "offer", "time"] as const;
export type ReminderToken = (typeof REMINDER_TOKENS)[number];

export const REMINDER_MESSAGE_MAX = 500;

export function renderReminderMessage(
  template: string | null | undefined,
  values: Record<ReminderToken, string>,
): string | null {
  const text = template?.trim();
  if (!text) return null;
  return text.replace(/\{(client|offer|time)\}/g, (_, token: ReminderToken) => values[token]);
}

/** The client's first name, as a reminder would greet them. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
