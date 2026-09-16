/** Minimal iCalendar builder for confirmed calendar bookings. */

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(date: Date) {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string | null;
  location?: string | null;
  organizer?: { name: string; email?: string | null } | null;
  url?: string | null;
  cancelled?: boolean;
};

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TheSessionLink//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}@thesessionlink`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description.slice(0, 900))}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.organizer) {
    const cn = escapeText(event.organizer.name);
    lines.push(
      event.organizer.email
        ? `ORGANIZER;CN=${cn}:mailto:${event.organizer.email}`
        : `ORGANIZER;CN=${cn}:mailto:noreply@thesessionlink.com`,
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/** "Add to Google Calendar" link for the booking success screen. */
export function googleCalendarUrl(event: Omit<IcsEvent, "uid">): string {
  const format = (date: Date) => toIcsDate(date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${format(event.start)}/${format(event.end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
