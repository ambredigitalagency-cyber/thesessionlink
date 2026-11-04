"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { ChoiceChips } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ToggleRow } from "@/components/ui/primitives";
import type {
  ActionType,
  AnyActionConfig,
  AskPhone,
  ContactRequestConfig,
  QuoteRequestConfig,
  WhatsappDirectConfig,
} from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

type Patch<T> = (patch: Partial<T>) => void;

/**
 * Settings that depend on the action type — never on the profession.
 *
 * Each type shows the one or two settings a coach actually has to think
 * about, and folds the rest into "Advanced settings", closed by default. The
 * defaults in lib/offers/schema.ts make an offer work as it is, so leaving
 * that section closed is a real choice, not an unfinished form: its closed
 * state says in one line what those defaults are.
 */
export function ActionConfigFields({
  actionType,
  config,
  onChange,
  profileWhatsapp,
}: {
  actionType: ActionType;
  config: AnyActionConfig;
  onChange: (config: AnyActionConfig) => void;
  profileWhatsapp?: string | null;
}) {
  const patch = (values: Record<string, unknown>) =>
    onChange({ ...(config as Record<string, unknown>), ...values } as AnyActionConfig);

  switch (actionType) {
    case "contact_request":
      return (
        <ContactFields
          config={config as ContactRequestConfig}
          patch={patch as Patch<ContactRequestConfig>}
        />
      );
    case "whatsapp_direct":
      return (
        <WhatsappFields
          config={config as WhatsappDirectConfig}
          patch={patch as Patch<WhatsappDirectConfig>}
          profileWhatsapp={profileWhatsapp}
        />
      );
    case "quote_request":
      return (
        <QuoteFields
          config={config as QuoteRequestConfig}
          patch={patch as Patch<QuoteRequestConfig>}
        />
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Advanced settings                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The fold. Closed, it is one row: its name and what the defaults currently
 * are, so nothing is hidden, only postponed. Open, it holds the controls.
 */
function Advanced({ summary, children }: { summary: string; children: ReactNode }) {
  const t = useTranslations("offers.config");
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="border-line rounded-[var(--radius-md)] border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="hover:bg-ink/[0.02] flex w-full items-center justify-between gap-4 rounded-[var(--radius-md)] px-4 py-3.5 text-left transition-colors"
      >
        <span className="min-w-0">
          <span className="text-ink block text-[14px] font-medium">{t("advanced")}</span>
          <span className="text-ink-muted mt-0.5 block text-[12.5px] leading-relaxed">
            {open ? t("advancedHint") : summary}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "text-ink-subtle size-4 shrink-0 motion-safe:transition-transform motion-safe:duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div id={id} className="border-line space-y-5 border-t px-4 pt-4 pb-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** "Aucune pause · préavis de 12 heures · …", first letter up. */
function sentence(parts: (string | null | undefined | false)[]): string {
  const text = parts.filter(Boolean).join(" · ");
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function usePhoneSummary() {
  const t = useTranslations("offers.config.summary");
  return (value: AskPhone) => t(`phone.${value}`);
}

function AskPhoneField({
  value,
  onChange,
}: {
  value: "hidden" | "optional" | "required";
  onChange: (value: "hidden" | "optional" | "required") => void;
}) {
  const t = useTranslations("offers.config");

  return (
    <Field label={t("askPhone")}>
      <ChoiceChips
        label={t("askPhone")}
        value={value}
        onChange={onChange}
        options={[
          { value: "hidden", label: t("askPhoneHidden") },
          { value: "optional", label: t("askPhoneOptional") },
          { value: "required", label: t("askPhoneRequired") },
        ]}
      />
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Per action type                                                             */
/* -------------------------------------------------------------------------- */

function ContactFields({
  config,
  patch,
}: {
  config: ContactRequestConfig;
  patch: Patch<ContactRequestConfig>;
}) {
  const t = useTranslations("offers.config");
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();

  const summary = sentence([
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
    phone(config.ask_phone),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("messagePrompt")} hint={t("messagePromptHint")} optional>
        <Textarea
          rows={2}
          value={config.message_prompt ?? ""}
          placeholder={t("messagePromptPlaceholder")}
          onChange={(event) => patch({ message_prompt: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
        <Field label={t("ctaLabel")} hint={t("ctaLabelHint")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaContactPlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
      </Advanced>
    </div>
  );
}

function WhatsappFields({
  config,
  patch,
  profileWhatsapp,
}: {
  config: WhatsappDirectConfig;
  patch: Patch<WhatsappDirectConfig>;
  profileWhatsapp?: string | null;
}) {
  const t = useTranslations("offers.config");
  const s = useTranslations("offers.config.summary");

  // Without a number on the profile, the offer cannot work until one is
  // given here — so the field stays out in the open. With one, it is an
  // override, and an override is advanced.
  const numberField = (
    <Field
      label={t("whatsappNumber")}
      hint={
        profileWhatsapp
          ? t("whatsappNumberHint", { number: profileWhatsapp })
          : t("whatsappNumberMissing")
      }
      optional={Boolean(profileWhatsapp)}
    >
      <Input
        type="tel"
        inputMode="tel"
        value={config.whatsapp_number ?? ""}
        placeholder="+33 6 12 34 56 78"
        onChange={(event) => patch({ whatsapp_number: event.target.value || null })}
      />
    </Field>
  );

  const summary = sentence([
    config.whatsapp_number
      ? s("whatsappOwn", { number: config.whatsapp_number })
      : profileWhatsapp && s("whatsappProfile", { number: profileWhatsapp }),
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
  ]);

  return (
    <div className="space-y-5">
      {profileWhatsapp ? null : numberField}

      <Field label={t("prefilledMessage")} hint={t("prefilledMessageHint")} optional>
        <Textarea
          rows={2}
          value={config.prefilled_message ?? ""}
          placeholder={t("prefilledMessagePlaceholder")}
          onChange={(event) => patch({ prefilled_message: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
        {profileWhatsapp ? numberField : null}

        <Field label={t("ctaLabel")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaWhatsappPlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>
      </Advanced>
    </div>
  );
}

function QuoteFields({
  config,
  patch,
}: {
  config: QuoteRequestConfig;
  patch: Patch<QuoteRequestConfig>;
}) {
  const t = useTranslations("offers.config");
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();

  const summary = sentence([
    config.ask_budget && s("budget"),
    config.ask_preferred_date && s("dateAsked"),
    phone(config.ask_phone),
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("briefPrompt")} hint={t("briefPromptHint")} optional>
        <Textarea
          rows={2}
          value={config.brief_prompt ?? ""}
          placeholder={t("briefPromptPlaceholder")}
          onChange={(event) => patch({ brief_prompt: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
        <div className="divide-line border-line divide-y border-y">
          <ToggleRow
            title={t("askBudget")}
            description={t("askBudgetHint")}
            checked={config.ask_budget}
            onCheckedChange={(ask_budget) => patch({ ask_budget })}
          />
          <ToggleRow
            title={t("askPreferredDate")}
            description={t("askPreferredDateHint")}
            checked={config.ask_preferred_date}
            onCheckedChange={(ask_preferred_date) => patch({ ask_preferred_date })}
          />
        </div>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />

        <Field label={t("ctaLabel")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaQuotePlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>
      </Advanced>
    </div>
  );
}
