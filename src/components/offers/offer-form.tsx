"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createOffer, updateOffer } from "@/actions/offers";
import { OfferPhotosUpload } from "@/components/media/offer-photos-upload";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { ToggleRow } from "@/components/ui/primitives";
import {
  defaultActionConfig,
  parseActionConfig,
  type ActionType,
  type AnyActionConfig,
  type CategoryField,
  type OfferField,
} from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

import { ActionConfigFields } from "./action-config-fields";
import { ActionTypePicker } from "./action-type-picker";
import { CustomFieldsEditor, mergeSuggestions, suggestedFieldsFor } from "./custom-fields-editor";

export type OfferInitialValues = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: "fixed" | "from" | "free" | "on_request";
  photos: string[];
  action_type: ActionType;
  action_config: unknown;
  custom_fields: OfferField[];
  is_active: boolean;
};

type Props = {
  mode: "create" | "edit";
  /** Onboarding walks through the two steps; the dashboard shows both at once. */
  layout: "wizard" | "stacked";
  categoryFields: CategoryField[];
  suggestedActionType?: ActionType | null;
  currency: string;
  locale: string;
  profileWhatsapp?: string | null;
  initial?: OfferInitialValues;
  submitLabel?: string;
  onSaved?: (offerId: string) => void;
  onCancel?: () => void;
};

export function OfferForm({
  mode,
  layout,
  categoryFields,
  suggestedActionType,
  currency,
  locale,
  profileWhatsapp,
  initial,
  submitLabel,
  onSaved,
  onCancel,
}: Props) {
  const t = useTranslations("offers.form");
  const tError = useTranslations("errors");

  const startingActionType =
    initial?.action_type ?? suggestedActionType ?? ("calendar_booking" as ActionType);

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceType, setPriceType] = useState(initial?.price_type ?? "fixed");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [actionType, setActionType] = useState<ActionType>(startingActionType);

  // Keep per-type settings around so switching back and forth is not destructive.
  const [configs, setConfigs] = useState<Partial<Record<ActionType, AnyActionConfig>>>(() => ({
    [startingActionType]: initial
      ? parseActionConfig(startingActionType, initial.action_config)
      : defaultActionConfig(startingActionType),
  }));

  const [fields, setFields] = useState<OfferField[]>(() =>
    initial
      ? mergeSuggestions(initial.custom_fields, categoryFields, startingActionType, locale)
      : suggestedFieldsFor(categoryFields, startingActionType, locale),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const config = useMemo(
    () => configs[actionType] ?? defaultActionConfig(actionType),
    [configs, actionType],
  );

  function changeActionType(next: ActionType) {
    setActionType(next);
    setConfigs((current) => ({
      ...current,
      [next]: current[next] ?? defaultActionConfig(next),
    }));
    setFields((current) => mergeSuggestions(current, categoryFields, next, locale));
  }

  function validateStepOne() {
    const nextErrors: Record<string, string> = {};
    if (title.trim().length < 2) nextErrors.title = "too_short";
    if (
      (priceType === "fixed" || priceType === "from") &&
      price !== "" &&
      Number.isNaN(Number(price))
    ) {
      nextErrors.price = "invalid_input";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submit() {
    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      price:
        priceType === "free" || priceType === "on_request" || price === "" ? null : Number(price),
      price_type: priceType,
      photos,
      action_type: actionType,
      action_config: config,
      custom_fields: fields,
      is_active: isActive,
    };

    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateOffer(initial.id, payload)
          : await createOffer(payload);

      if (result.ok) {
        toast.success(t(mode === "edit" ? "updated" : "created"));
        setErrors({});
        onSaved?.(
          mode === "edit" && initial
            ? initial.id
            : ((result.data as { id: string } | undefined)?.id ?? ""),
        );
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  const essentials = (
    <div className="space-y-5">
      <Field label={t("title")} error={errorFor("title")}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={120}
          autoFocus={mode === "create"}
        />
      </Field>

      <Field label={t("description")} hint={t("descriptionHint")} optional>
        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={5000}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field label={t("price")} error={errorFor("price")}>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              disabled={priceType === "free" || priceType === "on_request"}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0"
            />
            <span className="border-line-strong text-ink-muted flex h-11 items-center rounded-[var(--radius-sm)] border px-3 text-[14px]">
              {currency}
            </span>
          </div>
        </Field>

        <Field label={t("priceType")}>
          <NativeSelect
            value={priceType}
            onChange={(event) => setPriceType(event.target.value as typeof priceType)}
          >
            <option value="fixed">{t("priceFixed")}</option>
            <option value="from">{t("priceFrom")}</option>
            <option value="free">{t("priceFree")}</option>
            <option value="on_request">{t("priceOnRequest")}</option>
          </NativeSelect>
        </Field>
      </div>

      <Field label={t("photos")} hint={t("photosHint")} optional>
        <OfferPhotosUpload value={photos} onChange={setPhotos} />
      </Field>

      <Field label={t("actionType")} hint={t("actionTypeHint")}>
        <ActionTypePicker
          value={actionType}
          onChange={changeActionType}
          suggested={suggestedActionType}
        />
      </Field>
    </div>
  );

  const details = (
    <div className="space-y-7">
      <section className="space-y-4">
        <div>
          <h3 className="text-ink text-[15px] font-semibold">{t("settingsTitle")}</h3>
          <p className="text-ink-muted mt-0.5 text-[13px]">{t("settingsHint")}</p>
        </div>
        <ActionConfigFields
          actionType={actionType}
          config={config}
          locale={locale}
          profileWhatsapp={profileWhatsapp}
          onChange={(next) => setConfigs((current) => ({ ...current, [actionType]: next }))}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-ink text-[15px] font-semibold">{t("detailsTitle")}</h3>
          <p className="text-ink-muted mt-0.5 text-[13px]">{t("detailsHint")}</p>
        </div>
        <CustomFieldsEditor
          fields={fields}
          onChange={setFields}
          categoryFields={categoryFields}
          locale={locale}
        />
      </section>

      {mode === "edit" ? (
        <section className="divide-line border-line divide-y border-y">
          <ToggleRow
            title={t("visible")}
            description={t("visibleHint")}
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </section>
      ) : null}
    </div>
  );

  if (layout === "stacked") {
    return (
      <div className="space-y-8">
        {essentials}
        <hr className="border-line" />
        {details}
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("cancel")}
            </Button>
          ) : null}
          <Button type="button" onClick={submit} loading={pending}>
            {submitLabel ?? t("save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader step={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: step === 1 ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step === 1 ? 12 : -12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 ? essentials : details}
        </motion.div>
      </AnimatePresence>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-5">
        {step === 2 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(1)}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>
        ) : (
          <span />
        )}

        {step === 1 ? (
          <Button
            type="button"
            onClick={() => {
              if (validateStepOne()) setStep(2);
            }}
          >
            {t("continue")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} loading={pending}>
            <Check className="size-4" />
            {submitLabel ?? t("create")}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepHeader({ step }: { step: 1 | 2 }) {
  const t = useTranslations("offers.form");

  return (
    <div className="flex gap-2">
      {[1, 2].map((item) => (
        <div key={item} className="flex-1 space-y-1.5">
          <div
            className={cn(
              "h-1 rounded-full transition-colors duration-300",
              item <= step ? "bg-ink" : "bg-ink/10",
            )}
          />
          <p
            className={cn(
              "text-[12px] font-medium transition-colors",
              item <= step ? "text-ink" : "text-ink-subtle",
            )}
          >
            {item === 1 ? t("stepOne") : t("stepTwo")}
          </p>
        </div>
      ))}
    </div>
  );
}
