import { CalendarClock, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { ManageBookingActions } from "@/components/public-profile/manage-booking";
import { Badge } from "@/components/ui/primitives";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("manageBooking");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ManageBookingPage({
  params,
  searchParams,
}: PageProps<"/booking/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  const rawPayment = Array.isArray(query.payment) ? query.payment[0] : query.payment;

  // The token is the credential: it is only in the client's confirmation email.
  const supabase = createSupabaseAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();

  if (!booking) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, slug, timezone, location, contact_email")
    .eq("id", booking.profile_id)
    .single();

  const locale: Locale = isLocale(booking.locale) ? booking.locale : "en";
  const messages = pickMessages(await getMessages({ locale }), [
    ...BASE_NAMESPACES,
    "manageBooking",
    "bookingStatus",
  ]);
  const t = await getTranslations({ locale, namespace: "manageBooking" });
  const tStatus = await getTranslations({ locale, namespace: "bookingStatus" });

  /**
   * What to say about the payment, if anything.
   *
   * The URL only says the client came back from a gateway; the booking row
   * says whether the money actually arrived. When a webhook is still in
   * flight the honest answer is "we are checking", not "paid".
   */
  const paymentNotice =
    rawPayment === "cancelled"
      ? "cancelled"
      : rawPayment === "done"
        ? booking.payment_status === "paid"
          ? "paid"
          : booking.payment_status === "pending"
            ? "checking"
            : "failed"
        : booking.payment_status === "paid"
          ? "paid"
          : null;

  const timezone = booking.client_timezone || profile?.timezone || "UTC";
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const when = booking.starts_at
    ? new Intl.DateTimeFormat(tag, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(booking.starts_at))
    : booking.requested_date
      ? new Intl.DateTimeFormat(tag, { dateStyle: "full", timeZone: "UTC" }).format(
          new Date(`${booking.requested_date}T12:00:00Z`),
        )
      : null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-50" />

        <div className="relative w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <div className="surface-card p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-ink-muted text-[13px]">{profile?.display_name}</p>
              <Badge
                tone={
                  booking.status === "confirmed"
                    ? "success"
                    : booking.status === "cancelled"
                      ? "neutral"
                      : "warning"
                }
              >
                {tStatus(booking.status)}
              </Badge>
            </div>

            {paymentNotice ? (
              <p
                className={
                  paymentNotice === "paid"
                    ? "bg-success-soft text-success mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[13.5px]"
                    : "bg-warning-soft text-warning mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[13.5px]"
                }
              >
                {t(`payment.${paymentNotice}` as "payment.paid")}
              </p>
            ) : null}

            <h1 className="text-ink mt-2 text-[24px] font-semibold tracking-[-0.03em]">
              {booking.offer_title}
            </h1>

            {when ? (
              <p className="text-ink mt-4 flex items-start gap-2.5 text-[15px]">
                <CalendarClock className="text-ink-subtle mt-0.5 size-4 shrink-0" />
                <span>
                  {when}
                  <span className="text-ink-subtle mt-0.5 block text-[12.5px]">
                    {timezone.replace(/_/g, " ")}
                  </span>
                </span>
              </p>
            ) : null}

            {profile?.location ? (
              <p className="text-ink-muted mt-2.5 flex items-center gap-2.5 text-[14px]">
                <MapPin className="text-ink-subtle size-4 shrink-0" />
                {profile.location}
              </p>
            ) : null}

            <div className="border-line mt-6 border-t pt-5">
              <ManageBookingActions
                token={token}
                status={booking.status}
                profileSlug={profile?.slug ?? ""}
                contactEmail={profile?.contact_email ?? null}
              />
            </div>
          </div>

          <p className="text-ink-subtle mt-5 text-center text-[12.5px]">{t("footer")}</p>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
