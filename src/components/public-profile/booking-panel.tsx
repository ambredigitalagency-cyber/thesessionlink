"use client";

import { CalendarPlus, Check, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createPublicBooking } from "@/actions/public-booking";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { onlinePaymentFor, parseActionConfig, type AskPhone } from "@/lib/offers/schema";
import { chargeableAmount } from "@/lib/payments/amount";
import { googleCalendarUrl } from "@/lib/scheduling/ics";
import { toLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import { PaymentChoice, type PaymentOption } from "./payment-choice";
import { SlotPicker } from "./slot-picker";
import type { PublicOffer, PublicProfile } from "./types";

type Success = {
  manageToken: string;
  status: "pending" | "confirmed" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
};

export function BookingPanel({ offer, profile }: { offer: PublicOffer; profile: PublicProfile }) {
  const t = useTranslations("publicProfile.booking");
  const tError = useTranslations("errors");
  const locale = toLocale(useLocale());

  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentChoice, setPaymentChoice] = useState<PaymentOption | null>(null);
  const [company, setCompany] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [pending, startTransition] = useTransition();

  const isCalendar = offer.action_type === "calendar_booking";
  const isReservation = offer.action_type === "direct_reservation";
  const isQuote = offer.action_type === "quote_request";
  const isContact = offer.action_type === "contact_request";

  const calendarConfig = isCalendar
    ? parseActionConfig("calendar_booking", offer.action_config)
    : null;
  const reservationConfig = isReservation
    ? parseActionConfig("direct_reservation", offer.action_config)
    : null;
  const quoteConfig = isQuote ? parseActionConfig("quote_request", offer.action_config) : null;
  const contactConfig = isContact
    ? parseActionConfig("contact_request", offer.action_config)
    : null;

  const askPhone: AskPhone =
    calendarConfig?.ask_phone ??
    reservationConfig?.ask_phone ??
    quoteConfig?.ask_phone ??
    contactConfig?.ask_phone ??
    "optional";

  const messagePrompt = contactConfig?.message_prompt ?? quoteConfig?.brief_prompt ?? null;
  const messageRequired = isContact || isQuote;

  /* ---- Paying ------------------------------------------------------------ */

  // Only the two transaction types carry a payment setting; for the others
  // onlinePaymentFor() answers "off" whatever it is handed.
  const payableConfig = calendarConfig ?? reservationConfig;
  const paymentMode = payableConfig ? onlinePaymentFor(offer.action_type, payableConfig) : "off";
  const amountCents = chargeableAmount(offer, profile.currency, isReservation ? quantity : 1);

  // Every condition has to hold: the offer asks for it, the amount is real, and
  // the coach has somewhere for the money to land.
  const showPayment =
    paymentMode !== "off" && amountCents !== null && profile.paymentProviders.length > 0;
  const paymentRequired = showPayment && paymentMode === "required";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.client_name = "too_short";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) nextErrors.client_email = "invalid_email";
    if (askPhone === "required" && phone.trim().length < 6) nextErrors.client_phone = "required";
    if (messageRequired && message.trim().length < 5) nextErrors.message = "too_short";
    if (isCalendar && !slot) nextErrors.slot = "slot_required";
    if (isReservation && reservationConfig?.date_mode === "required" && !date) {
      nextErrors.requested_date = "required";
    }
    if (showPayment && !paymentChoice) nextErrors.payment_choice = "payment_choice_required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const result = await createPublicBooking({
        offer_id: offer.id,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim() || null,
        message: message.trim() || null,
        start: isCalendar ? slot : null,
        requested_date: (isReservation || isQuote) && date ? date : null,
        quantity: isReservation ? quantity : 1,
        budget: isQuote && quoteConfig?.ask_budget ? budget.trim() || null : null,
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale,
        payment_choice: showPayment ? paymentChoice : null,
        company,
      });

      if (result.ok && result.data?.redirectUrl) {
        // Off to the gateway. The booking exists and is holding the slot; it
        // is confirmed only once the provider tells our server it was paid.
        window.location.assign(result.data.redirectUrl);
      } else if (result.ok && result.data) {
        setSuccess(result.data);
      } else if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  if (success) {
    return <SuccessState success={success} offer={offer} profile={profile} />;
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {isCalendar ? (
        <div className="space-y-2">
          <p className="text-ink text-[13px] font-medium">{t("pickSlot")}</p>
          <SlotPicker offerId={offer.id} locale={locale} selected={slot} onSelect={setSlot} />
          {errors.slot ? (
            <p className="text-danger text-[13px]">{tError("slot_required")}</p>
          ) : null}
        </div>
      ) : null}

      {isReservation && reservationConfig?.date_mode !== "none" ? (
        <Field
          label={t("preferredDate")}
          optional={reservationConfig?.date_mode === "optional"}
          error={errorFor("requested_date")}
        >
          <Input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      ) : null}

      {isReservation && (reservationConfig?.max_quantity_per_booking ?? 1) > 1 ? (
        <Field label={reservationConfig?.quantity_label || t("quantity")}>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label={t("decrease")}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="text-ink w-8 text-center text-[16px] font-semibold tabular-nums">
              {quantity}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={() =>
                setQuantity((value) =>
                  Math.min(reservationConfig?.max_quantity_per_booking ?? 1, value + 1),
                )
              }
              aria-label={t("increase")}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </Field>
      ) : null}

      {isQuote && quoteConfig?.ask_preferred_date ? (
        <Field label={t("preferredDate")} optional>
          <Input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} error={errorFor("client_name")}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder={t("namePlaceholder")}
          />
        </Field>

        <Field label={t("email")} error={errorFor("client_email")}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
          />
        </Field>
      </div>

      {askPhone !== "hidden" ? (
        <Field
          label={t("phone")}
          optional={askPhone === "optional"}
          error={errorFor("client_phone")}
        >
          <Input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
      ) : null}

      {isQuote && quoteConfig?.ask_budget ? (
        <Field label={t("budget")} optional>
          <Input
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder={t("budgetPlaceholder")}
          />
        </Field>
      ) : null}

      <Field
        label={t("message")}
        hint={messagePrompt}
        optional={!messageRequired}
        error={errorFor("message")}
      >
        <Textarea
          rows={isContact || isQuote ? 4 : 3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={messagePrompt ?? t("messagePlaceholder")}
        />
      </Field>

      {/* Honeypot: hidden from humans, irresistible to bots. */}
      <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-0 overflow-hidden">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      {showPayment ? (
        <PaymentChoice
          amountCents={amountCents}
          currency={profile.currency}
          locale={locale}
          providers={profile.paymentProviders}
          allowOnSite={!paymentRequired}
          value={paymentChoice}
          onChange={(choice) => {
            setPaymentChoice(choice);
            // Clearing the error the moment they answer it.
            setErrors((current) => {
              if (!current.payment_choice) return current;
              const next = { ...current };
              delete next.payment_choice;
              return next;
            });
          }}
          error={errorFor("payment_choice")}
        />
      ) : null}

      {formError ? (
        <p className="bg-danger-soft text-danger rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[13.5px]">
          {tError(formError as "unexpected")}
        </p>
      ) : null}

      <Button type="submit" variant="accent" size="lg" block loading={pending}>
        {showPayment && paymentChoice && paymentChoice !== "on_site"
          ? t("submitPay")
          : isCalendar
            ? t("submitBooking")
            : isReservation
              ? t("submitReservation")
              : isQuote
                ? t("submitQuote")
                : t("submitMessage")}
      </Button>

      <p className="text-ink-subtle text-center text-[12px]">{t("confirmationNote")}</p>
    </form>
  );
}

function SuccessState({
  success,
  offer,
  profile,
}: {
  success: Success;
  offer: PublicOffer;
  profile: PublicProfile;
}) {
  const t = useTranslations("publicProfile.booking");
  const locale = useLocale();
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const when = success.startsAt
    ? new Intl.DateTimeFormat(tag, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).format(new Date(success.startsAt))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center py-6 text-center"
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 380, damping: 18 }}
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          success.status === "confirmed"
            ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
            : "bg-ink/5 text-ink",
        )}
      >
        <Check className="size-6" />
      </motion.span>

      <h3 className="text-ink mt-4 text-[20px] font-semibold tracking-[-0.02em]">
        {success.status === "confirmed" ? t("successConfirmed") : t("successPending")}
      </h3>
      <p className="text-ink-muted mt-1.5 max-w-sm text-[14.5px] leading-relaxed">
        {success.status === "confirmed"
          ? t("successConfirmedBody", { name: profile.display_name })
          : t("successPendingBody", { name: profile.display_name })}
      </p>

      {when ? (
        <p className="bg-ink/[0.04] text-ink mt-4 rounded-[var(--radius-sm)] px-4 py-2.5 text-[14px] font-medium">
          {when}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {success.startsAt && success.endsAt ? (
          <Button asChild variant="secondary" size="sm">
            <a
              href={googleCalendarUrl({
                start: new Date(success.startsAt),
                end: new Date(success.endsAt),
                title: `${offer.title} · ${profile.display_name}`,
                description: null,
                location: profile.location,
              })}
              target="_blank"
              rel="noreferrer"
            >
              <CalendarPlus className="size-3.5" />
              {t("addToCalendar")}
            </a>
          </Button>
        ) : null}

        <Button asChild variant="ghost" size="sm">
          <a href={`/booking/${success.manageToken}`}>{t("manageBooking")}</a>
        </Button>
      </div>
    </motion.div>
  );
}
