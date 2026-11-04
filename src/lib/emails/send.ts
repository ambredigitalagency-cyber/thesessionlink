import "server-only";

import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { isEmailConfigured, serverEnv } from "@/lib/env";
import { toLocale, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Tables } from "@/lib/supabase/database.types";

import { MagicLinkEmail, NoticeEmail, type DetailRow } from "./templates";

type SendArgs = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string | null;
};

/**
 * Sends through Resend. Without RESEND_API_KEY (local dev) the email is logged
 * instead, so every flow that emails stays testable offline.
 */
export async function sendEmail({ to, subject, react, replyTo }: SendArgs) {
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

export function formatDateOnly(date: Date, timezone: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "full",
    timeZone: timezone,
  }).format(date);
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
/* Requests from a public page                                                 */
/* -------------------------------------------------------------------------- */

/** A message or a quote request, as it was sent. Nothing of it is stored. */
export type PublicRequest = {
  offerTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  message: string;
  requestedDate: string | null;
  budget: string | null;
  locale: string;
};

type ProfileForEmail = Pick<Tables<"profiles">, "display_name" | "locale" | "contact_email">;

async function requestRows(
  request: PublicRequest,
  locale: Locale,
  audience: "client" | "pro",
): Promise<DetailRow[]> {
  const t = await getTranslator(locale, "emails.fields");
  const rows: DetailRow[] = [{ label: t("offer"), value: request.offerTitle }];

  if (request.requestedDate) {
    rows.push({
      label: t("requestedDate"),
      value: formatDateOnly(new Date(`${request.requestedDate}T12:00:00Z`), "UTC", locale),
    });
  }
  if (request.budget) rows.push({ label: t("budget"), value: request.budget });

  if (audience === "pro") {
    rows.push({ label: t("client"), value: request.clientName });
    rows.push({ label: t("email"), value: request.clientEmail });
    if (request.clientPhone) rows.push({ label: t("phone"), value: request.clientPhone });
  }

  return rows;
}

/**
 * The request itself, delivered to the coach. Replying answers the client
 * directly: the email is the whole conversation, there is no inbox to open.
 */
export async function sendRequestToPro({
  request,
  profile,
  to,
}: {
  request: PublicRequest;
  profile: ProfileForEmail;
  to: string;
}) {
  const locale = toLocale(profile.locale);
  const t = await getTranslator(locale, "emails.requestToPro");

  return sendEmail({
    to,
    replyTo: request.clientEmail,
    subject: t("subject", { client: request.clientName, offer: request.offerTitle }),
    react: NoticeEmail({
      preview: t("preview", { client: request.clientName }),
      heading: t("heading"),
      intro: t("intro", { client: request.clientName }),
      rows: await requestRows(request, locale, "pro"),
      message: request.message,
      messageLabel: t("clientMessage"),
      note: t("note", { client: request.clientName }),
      footerNote: t("footer"),
    }),
  });
}

/** The visitor's copy of what they sent, in their own language. */
export async function sendRequestAcknowledgement({
  request,
  profile,
}: {
  request: PublicRequest;
  profile: ProfileForEmail;
}) {
  const locale = toLocale(request.locale);
  const t = await getTranslator(locale, "emails.requestAcknowledgement");

  return sendEmail({
    to: request.clientEmail,
    replyTo: profile.contact_email,
    subject: t("subject", { pro: profile.display_name }),
    react: NoticeEmail({
      preview: t("preview", { pro: profile.display_name }),
      heading: t("heading"),
      intro: t("intro", { pro: profile.display_name }),
      rows: await requestRows(request, locale, "client"),
      message: request.message,
      messageLabel: t("yourMessage"),
      note: t("note"),
      footerNote: t("footer", { pro: profile.display_name }),
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
    react: NoticeEmail({
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

export type AccessEmailKind = "trial_ending" | "grace_started" | "offline_soon" | "offline";

const ACCESS_EMAIL_KEYS = {
  trial_ending: "trialEnding",
  grace_started: "graceStarted",
  offline_soon: "offlineSoon",
  offline: "offline",
} as const;

/**
 * The end-of-trial emails: the trial ends in 3 days, it has ended (the page
 * stays online 7 days), the page goes offline in 2 days, it went offline.
 * Short, factual, one button to the subscription screen. `date` is the date
 * the email is about (end of trial, or the page going offline); `daysLeft`
 * counts down to it.
 */
export async function sendAccessEmail({
  to,
  locale,
  kind,
  date,
  daysLeft,
  price,
  subscribeUrl,
}: {
  to: string;
  locale: Locale;
  kind: AccessEmailKind;
  date: Date;
  daysLeft: number;
  price: number;
  subscribeUrl: string;
}) {
  const t = await getTranslator(locale, "emails.access");
  const key = ACCESS_EMAIL_KEYS[kind];
  const day = formatDateOnly(date, "UTC", locale);
  const values = { date: day, count: daysLeft, price };

  return sendEmail({
    to,
    subject: t(`${key}.subject`, values),
    react: NoticeEmail({
      preview: t(`${key}.preview`, values),
      heading: t(`${key}.heading`, values),
      intro: t(`${key}.intro`, values),
      rows: [],
      cta: { href: subscribeUrl, label: t("cta", values) },
      footerNote: t("footer"),
    }),
  });
}
