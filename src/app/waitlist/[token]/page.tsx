import { CalendarClock, Hourglass } from "lucide-react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { readWaitlistOffer } from "@/actions/waitlist";
import { Logo } from "@/components/brand/logo";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";
import { WaitlistClaim } from "@/components/public-profile/waitlist-claim";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("waitlist");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Where the "a place has opened up" email lands: the slot, how long it is
 * held, and one button. The token in the link is the only credential, as for
 * the booking page.
 */
export default async function WaitlistPage({ params }: PageProps<"/waitlist/[token]">) {
  const { token } = await params;
  const offer = await readWaitlistOffer(token);
  if (!offer) notFound();

  const locale: Locale = isLocale(offer.locale) ? offer.locale : "en";
  const messages = pickMessages(await getMessages({ locale }), [...BASE_NAMESPACES, "waitlist"]);
  const t = await getTranslations({ locale, namespace: "waitlist" });
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  const timezone = offer.pro?.timezone ?? "UTC";

  const when = new Intl.DateTimeFormat(tag, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(offer.slotStart));
  const until = offer.expiresAt
    ? new Intl.DateTimeFormat(tag, { timeStyle: "short", timeZone: timezone }).format(
        new Date(offer.expiresAt),
      )
    : null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
        <PreferenceToggles tone="paper" className="absolute top-4 right-4 z-20" />
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-50" />

        <div className="relative w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <div className="surface-card p-6 sm:p-7">
            <p className="text-ink-muted text-[13px]">{offer.pro?.display_name}</p>
            <h1 className="text-ink mt-2 text-[24px] font-semibold tracking-[-0.03em]">
              {offer.offerTitle}
            </h1>

            <p className="text-ink mt-4 flex items-start gap-2.5 text-[15px]">
              <CalendarClock className="text-ink-subtle mt-0.5 size-4 shrink-0" />
              <span>
                {when}
                <span className="text-ink-subtle mt-0.5 block text-[12.5px]">
                  {timezone.replace(/_/g, " ")}
                </span>
              </span>
            </p>

            {offer.status === "open" && until ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-[12.5px] font-medium text-[var(--color-warning)]">
                <Hourglass className="size-3.5" aria-hidden />
                {t("heldUntil", { time: until })}
              </p>
            ) : null}

            <div className="border-line mt-6 border-t pt-5">
              <WaitlistClaim
                token={token}
                status={offer.status}
                profileSlug={offer.pro?.slug ?? ""}
              />
            </div>
          </div>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
