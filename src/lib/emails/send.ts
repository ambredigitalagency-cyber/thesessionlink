import "server-only";

import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { isEmailConfigured, serverEnv, siteUrl } from "@/lib/env";
import { toLocale, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { buildIcs } from "@/lib/scheduling/ics";
import type { Tables } from "@/lib/supabase/database.types";
import { absoluteUrl } from "@/lib/utils";

import { BookingNoticeEmail, MagicLinkEmail, type DetailRow } from "./templates";

type Attachment = { filename: string; content: string };

type SendArgs = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string | null;
  attachments?: Attachment[];
};

/**
 * Sends through Resend. Without RESEND_API_KEY (local dev) the email is logged
 * instead, so the whole booking flow stays testable offline.
 */
export async function sendEmail({ to, subject, react, replyTo, attachments }: SendArgs) {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (!isEmailConfigured()) {
    console.info(
      `\n--- email (not sent: RESEND_API_KEY missing) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`,
    );
    return { ok: true as const, skipped: true as const, to, subject, text };
  }

  try {
    const resend = new Resend(serverEnv.resendApiKey);
    const { error } = await resend.emails.send({
      from: serverEnv.emailFrom,
      to,
      subject,
      html,
      text,
      // `??` would keep an empty string: EMAIL_FROM unset, or a profile with no
      // contact email, would send Resend `reply_to: ""` and be rejected.
      replyTo: replyTo || serverEnv.emailReplyTo || undefined,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content).toString("base64"),
      })),
    });

    if (error) {
      console.error("[email] Resend error", error);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    console.error("[email] send failed", error);
    return { ok: false as const, error: "send_failed" };
  }
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

const localeTag = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-US");

export function formatDateTime(date: Date, timezone: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function formatDateOnly(date: Date, timezone: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "full",
    timeZone: timezone,
  }).format(date);
}

export function formatTimeRange(start: Date, end: Date, timezone: string, locale: Locale) {
  const time = new Intl.DateTimeFormat(localeTag(locale), {
    timeStyle: "short",
    timeZone: timezone,
  });
  return `${time.format(start)} – ${time.format(end)}`;
}

/* -------------------------------------------------------------------------- */
/* Magic link                                                                  */
/* -------------------------------------------------------------------------- */

export async function sendMagicLinkEmail({
  to,
  url,
  locale,
}: {
  to: string;
  url: string;
  locale: Locale;
}) {
  const t = await getTranslator(locale, "emails.magicLink");

  return sendEmail({
    to,
    subject: t("subject"),
    react: MagicLinkEmail({
      url,
      copy: {
        preview: t("preview"),
        heading: t("heading"),
        body: t("body"),
        cta: t("cta"),
        fallback: t("fallback"),
        ignore: t("ignore"),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Booking emails                                                              */
/* -------------------------------------------------------------------------- */

type Booking = Tables<"bookings">;
type ProfileForEmail = Pick<
  Tables<"profiles">,
  "display_name" | "slug" | "timezone" | "locale" | "contact_email"
>;

function manageUrl(booking: Booking) {
  return absoluteUrl(`/booking/${booking.manage_token}`, siteUrl);
}

async function bookingRows(
  booking: Booking,
  timezone: string,
  locale: Locale,
  audience: "client" | "pro",
): Promise<DetailRow[]> {
  const t = await getTranslator(locale, "emails.fields");
  const rows: DetailRow[] = [{ label: t("offer"), value: booking.offer_title }];

  if (booking.starts_at && booking.ends_at) {
    const start = new Date(booking.starts_at);
    const end = new Date(booking.ends_at);
    rows.push({ label: t("when"), value: formatDateTime(start, timezone, locale) });
    rows.push({
      label: t("time"),
      value: `${formatTimeRange(start, end, timezone, locale)} (${timezone})`,
    });
  } else if (booking.requested_date) {
    rows.push({
      label: t("requestedDate"),
      value: formatDateOnly(new Date(`${booking.requested_date}T12:00:00Z`), "UTC", locale),
    });
  }

  if (booking.quantity > 1) {
    rows.push({ label: t("quantity"), value: String(booking.quantity) });
  }

  if (audience === "pro") {
    rows.push({ label: t("client"), value: booking.client_name });
    rows.push({ label: t("email"), value: booking.client_email });
    if (booking.client_phone) rows.push({ label: t("phone"), value: booking.client_phone });
    const budget = (booking.details as Record<string, unknown> | null)?.budget;
    if (typeof budget === "string" && budget) {
      rows.push({ label: t("budget"), value: budget });
    }
  }

  return rows;
}

function icsAttachment(booking: Booking, profile: ProfileForEmail, cancelled = false) {
  if (!booking.starts_at || !booking.ends_at) return undefined;

  return [
    {
      filename: "booking.ics",
      content: buildIcs({
        uid: booking.id,
        start: new Date(booking.starts_at),
        end: new Date(booking.ends_at),
        title: `${booking.offer_title} · ${profile.display_name}`,
        description: booking.client_message,
        organizer: { name: profile.display_name, email: profile.contact_email },
        url: absoluteUrl(`/${profile.slug}`, siteUrl),
        cancelled,
      }),
    },
  ];
}

/** Confirmation sent to the client right after they book or ask. */
export async function sendBookingConfirmationToClient({
  booking,
  profile,
}: {
  booking: Booking;
  profile: ProfileForEmail;
}) {
  const locale = toLocale(booking.locale);
  const timezone = booking.client_timezone || profile.timezone;
  const t = await getTranslator(locale, "emails.clientConfirmation");
  const status = booking.status === "confirmed" ? "confirmed" : "pending";

  return sendEmail({
    to: booking.client_email,
    replyTo: profile.contact_email,
    subject: t(`${status}.subject`, { pro: profile.display_name }),
    attachments: status === "confirmed" ? icsAttachment(booking, profile) : undefined,
    react: BookingNoticeEmail({
      preview: t(`${status}.preview`, { pro: profile.display_name }),
      heading: t(`${status}.heading`),
      intro: t(`${status}.intro`, { pro: profile.display_name }),
      rows: await bookingRows(booking, timezone, locale, "client"),
      message: booking.client_message,
      messageLabel: t("yourMessage"),
      cta: { href: manageUrl(booking), label: t("cta") },
      note: t("note"),
      footerNote: t("footer", { pro: profile.display_name }),
    }),
  });
}

/** Notification sent to the pro for every new booking or request. */
export async function sendBookingNotificationToPro({
  booking,
  profile,
  to,
}: {
  booking: Booking;
  profile: ProfileForEmail;
  to: string;
}) {
  const locale = toLocale(profile.locale);
  const t = await getTranslator(locale, "emails.proNotification");

  return sendEmail({
    to,
    replyTo: booking.client_email,
    subject: t("subject", { client: booking.client_name, offer: booking.offer_title }),
    attachments: booking.status === "confirmed" ? icsAttachment(booking, profile) : undefined,
    react: BookingNoticeEmail({
      preview: t("preview", { client: booking.client_name }),
      heading: t(booking.status === "confirmed" ? "headingConfirmed" : "headingPending"),
      intro: t("intro", { client: booking.client_name }),
      rows: await bookingRows(booking, profile.timezone, locale, "pro"),
      message: booking.client_message,
      messageLabel: t("clientMessage"),
      cta: { href: absoluteUrl("/dashboard/bookings", siteUrl), label: t("cta") },
      footerNote: t("footer"),
    }),
  });
}

/** Reminder before a session (calendar bookings only). */
export async function sendBookingReminder({
  booking,
  profile,
}: {
  booking: Booking;
  profile: ProfileForEmail;
}) {
  const locale = toLocale(booking.locale);
  const timezone = booking.client_timezone || profile.timezone;
  const t = await getTranslator(locale, "emails.reminder");
  const start = booking.starts_at ? new Date(booking.starts_at) : null;

  return sendEmail({
    to: booking.client_email,
    replyTo: profile.contact_email,
    subject: t("subject", { offer: booking.offer_title }),
    attachments: icsAttachment(booking, profile),
    react: BookingNoticeEmail({
      preview: start ? formatDateTime(start, timezone, locale) : booking.offer_title,
      heading: t("heading"),
      intro: t("intro", { pro: profile.display_name }),
      rows: await bookingRows(booking, timezone, locale, "client"),
      cta: { href: manageUrl(booking), label: t("cta") },
      note: t("note"),
      footerNote: t("footer", { pro: profile.display_name }),
    }),
  });
}

/** Sent when the pro confirms or cancels a pending request. */
export async function sendBookingStatusUpdate({
  booking,
  profile,
}: {
  booking: Booking;
  profile: ProfileForEmail;
}) {
  const locale = toLocale(booking.locale);
  const timezone = booking.client_timezone || profile.timezone;
  const status = booking.status === "cancelled" ? "cancelled" : "confirmed";
  const t = await getTranslator(locale, `emails.statusUpdate.${status}`);

  return sendEmail({
    to: booking.client_email,
    replyTo: profile.contact_email,
    subject: t("subject", { offer: booking.offer_title }),
    attachments:
      status === "confirmed"
        ? icsAttachment(booking, profile)
        : icsAttachment(booking, profile, true),
    react: BookingNoticeEmail({
      preview: t("preview", { pro: profile.display_name }),
      heading: t("heading"),
      intro: t("intro", { pro: profile.display_name }),
      rows: await bookingRows(booking, timezone, locale, "client"),
      cta:
        status === "confirmed"
          ? { href: manageUrl(booking), label: t("cta") }
          : { href: absoluteUrl(`/${profile.slug}`, siteUrl), label: t("cta") },
      footerNote: t("footer", { pro: profile.display_name }),
    }),
  });
}

/** Sent to the pro when a client cancels from their manage link. */
export async function sendClientCancellationToPro({
  booking,
  profile,
  to,
}: {
  booking: Booking;
  profile: ProfileForEmail;
  to: string;
}) {
  const locale = toLocale(profile.locale);
  const t = await getTranslator(locale, "emails.clientCancellation");

  return sendEmail({
    to,
    subject: t("subject", { client: booking.client_name }),
    react: BookingNoticeEmail({
      preview: t("preview", { client: booking.client_name }),
      heading: t("heading"),
      intro: t("intro", { client: booking.client_name }),
      rows: await bookingRows(booking, profile.timezone, locale, "pro"),
      cta: { href: absoluteUrl("/dashboard/bookings", siteUrl), label: t("cta") },
      footerNote: t("footer"),
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sent a week before an account marked for deletion is actually purged.
 *
 * The coach asked for this a while ago and may well have forgotten; this is
 * their last chance to say so before the data goes. There is no one-click
 * undo on purpose — reactivating goes through support, so the email carries a
 * contact link rather than a button that acts.
 */
export async function sendAccountDeletionWarning({
  to,
  locale,
  dueAt,
  daysLeft,
  supportEmail,
}: {
  to: string;
  locale: Locale;
  dueAt: Date;
  daysLeft: number;
  supportEmail: string | null;
}) {
  const t = await getTranslator(locale, "emails.deletionWarning");
  const date = formatDateOnly(dueAt, "UTC", locale);

  return sendEmail({
    to,
    subject: t("subject", { count: daysLeft }),
    react: BookingNoticeEmail({
      preview: t("preview", { date }),
      heading: t("heading", { count: daysLeft }),
      intro: t("intro"),
      rows: [{ label: t("dateLabel"), value: date }],
      cta: supportEmail
        ? {
            href: `mailto:${supportEmail}?subject=${encodeURIComponent(t("subject", { count: daysLeft }))}`,
            label: t("cta"),
          }
        : undefined,
      note: t("note"),
      footerNote: t("footer"),
    }),
  });
}
