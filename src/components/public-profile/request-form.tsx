"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { sendPublicRequest } from "@/actions/public-request";
import { pageOrigin } from "@/components/page/tracking";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { parseActionConfig, type AskPhone } from "@/lib/offers/schema";
import { toLocale } from "@/lib/i18n/config";

import type { PublicOffer, PublicProfile } from "./types";

/**
 * The form behind a message or a quote request. What it sends is an email to
 * the coach, who answers the client directly.
 */
export function RequestForm({
  offer,
  profile,
  blockId = null,
}: {
  offer: PublicOffer;
  profile: PublicProfile;
  /** The service block the offer was opened from, for the statistics. */
  blockId?: string | null;
}) {
  const t = useTranslations("publicProfile.request");
  const tError = useTranslations("errors");
  const locale = toLocale(useLocale());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const isQuote = offer.action_type === "quote_request";

  const quoteConfig = isQuote ? parseActionConfig("quote_request", offer.action_config) : null;
  const contactConfig =
    offer.action_type === "contact_request"
      ? parseActionConfig("contact_request", offer.action_config)
      : null;

  const askPhone: AskPhone = quoteConfig?.ask_phone ?? contactConfig?.ask_phone ?? "optional";
  const messagePrompt = contactConfig?.message_prompt ?? quoteConfig?.brief_prompt ?? null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.client_name = "too_short";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) nextErrors.client_email = "invalid_email";
    if (askPhone === "required" && phone.trim().length < 6) nextErrors.client_phone = "required";
    if (message.trim().length < 5) nextErrors.message = "too_short";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      const result = await sendPublicRequest({
        offer_id: offer.id,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim() || null,
        message: message.trim(),
        requested_date: isQuote && date ? date : null,
        budget: isQuote && quoteConfig?.ask_budget ? budget.trim() || null : null,
        locale,
        company,
        // Where this visitor came from, so the contact counts for that source.
        block_id: blockId,
        ...pageOrigin(),
      });

      if (result.ok) {
        setSent(true);
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  if (sent) {
    return <SentState name={profile.display_name} />;
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
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

      <Field label={t("message")} hint={messagePrompt} error={errorFor("message")}>
        <Textarea
          rows={4}
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

      {formError ? (
        <p className="bg-danger-soft text-danger rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[13.5px]">
          {tError(formError as "unexpected")}
        </p>
      ) : null}

      <Button type="submit" variant="accent" size="lg" block loading={pending}>
        {isQuote ? t("submitQuote") : t("submitMessage")}
      </Button>

      <p className="text-ink-subtle text-center text-[12px]">{t("confirmationNote")}</p>
    </form>
  );
}

function SentState({ name }: { name: string }) {
  const t = useTranslations("publicProfile.request");

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
        className="flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]"
      >
        <Check className="size-6" />
      </motion.span>

      <h3 className="text-ink mt-4 text-[20px] font-semibold tracking-[-0.02em]">{t("sent")}</h3>
      <p className="text-ink-muted mt-1.5 max-w-sm text-[14.5px] leading-relaxed">
        {t("sentBody", { name })}
      </p>
    </motion.div>
  );
}
