"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { createOffer, updateOffer } from "@/actions/offers";
import { OfferPhotosUpload } from "@/components/media/offer-photos-upload";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { ToggleRow } from "@/components/ui/primitives";
import { offerFieldsSchema, type OfferField } from "@/lib/offers/fields";
import {
  defaultActionConfig,
  parseActionConfig,
  type ActionType,
  type AnyActionConfig,
  type CategoryField,
} from "@/lib/offers/schema";
import { cn } from "@/lib/utils";
import { fieldErrorsFrom } from "@/lib/validation";

import { ActionConfigFields } from "./action-config-fields";
import { ActionTypePicker } from "./action-type-picker";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { OfferReview, type ReviewDraft } from "./offer-review";

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

const STEPS = ["essentials", "details", "photos", "review"] as const;
export type OfferStep = (typeof STEPS)[number];

type Props = {
  mode: "create" | "edit";
  /**
   * Creating walks through the steps and ends on a review; editing an offer
   * that already exists shows every section on one page, so a small change is
   * one scroll and one save.
   */
  layout: "wizard" | "sections";
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

/** Which step owns an error key, so a rejected save lands on it. */
function stepForError(key: string): OfferStep {
  if (key.startsWith("custom_fields")) return "details";
  if (key.startsWith("photos")) return "photos";
  return "essentials";
}

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

  const [step, setStep] = useState<OfferStep>("essentials");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceType, setPriceType] = useState(initial?.price_type ?? "fixed");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [actionType, setActionType] = useState<ActionType>(startingActionType);
  const [fields, setFields] = useState<OfferField[]>(initial?.custom_fields ?? []);

  // Keep per-type settings around so switching back and forth is not destructive.
  const [configs, setConfigs] = useState<Partial<Record<ActionType, AnyActionConfig>>>(() => ({
    [startingActionType]: initial
      ? parseActionConfig(startingActionType, initial.action_config)
      : defaultActionConfig(startingActionType),
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

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
  }

  function essentialsErrors() {
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = "too_short";
    if (
      (priceType === "fixed" || priceType === "from") &&
      price !== "" &&
      Number.isNaN(Number(price))
    ) {
      found.price = "invalid_input";
    }
    return found;
  }

  /** The same rules the server applies, run before leaving the step. */
  function detailsErrors(list = fields): Record<string, string> {
    const result = offerFieldsSchema.safeParse(list);
    if (result.success) return {};
    return Object.fromEntries(
      Object.entries(fieldErrorsFrom(result.error)).map(([key, code]) => [
        key === "form" ? "custom_fields" : `custom_fields.${key}`,
        code,
      ]),
    );
  }

  function validate(scope: "essentials" | "details" | "all") {
    const found = {
      ...(scope !== "details" ? essentialsErrors() : {}),
      ...(scope !== "essentials" ? detailsErrors() : {}),
    };
    setErrors(found);
    return found;
  }

  /**
   * Once the details show errors, re-check them on every change so a fixed
   * field clears its message right away instead of on the next "Continue".
   */
  function changeFields(next: OfferField[]) {
    setFields(next);
    setErrors((current) => {
      const keys = Object.keys(current);
      if (!keys.some((key) => key.startsWith("custom_fields"))) return current;
      const kept = Object.fromEntries(
        keys.filter((key) => !key.startsWith("custom_fields")).map((key) => [key, current[key]]),
      );
      return { ...kept, ...detailsErrors(next) };
    });
  }

  function goTo(target: OfferStep) {
    setDirection(STEPS.indexOf(target) >= STEPS.indexOf(step) ? 1 : -1);
    setStep(target);
    // Move focus with the content, so keyboard and screen reader users follow.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function next() {
    if (step === "essentials" && Object.keys(validate("essentials")).length > 0) return;
    if (step === "details" && Object.keys(validate("details")).length > 0) return;
    goTo(STEPS[STEPS.indexOf(step) + 1]);
  }

  function submit() {
    const firstError = Object.keys(validate("all"))[0];
    if (firstError) {
      if (layout === "wizard") goTo(stepForError(firstError));
      toast.error(tError("form_has_errors"));
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
        const serverErrors = result.fieldErrors ?? {};
        setErrors(serverErrors);
        const first = Object.keys(serverErrors)[0];
        if (first && layout === "wizard") goTo(stepForError(first));
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

      <Field label={t("actionType")} hint={t("actionTypeHint")}>
        <ActionTypePicker
          value={actionType}
          onChange={changeActionType}
          suggested={suggestedActionType}
        />
      </Field>

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
          onChange={(nextConfig) =>
            setConfigs((current) => ({ ...current, [actionType]: nextConfig }))
          }
        />
      </section>
    </div>
  );

  const details = (
    <CustomFieldsEditor
      fields={fields}
      onChange={changeFields}
      suggestions={categoryFields}
      actionType={actionType}
      locale={locale}
      errors={errors}
    />
  );

  const photosSection = (
    <Field label={t("photos")} hint={t("photosHint")} optional>
      <OfferPhotosUpload value={photos} onChange={setPhotos} />
    </Field>
  );

  if (layout === "sections") {
    return (
      <div className="space-y-10">
        <FormSection title={t("steps.essentials")} hint={t("stepHints.essentials")}>
          {essentials}
        </FormSection>
        <FormSection title={t("steps.details")} hint={t("stepHints.details")}>
          {details}
        </FormSection>
        <FormSection title={t("steps.photos")} hint={t("stepHints.photos")}>
          {photosSection}
        </FormSection>
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

  const draft: ReviewDraft = {
    title: title.trim(),
    description: description.trim() || null,
    price:
      priceType === "free" || priceType === "on_request" || price === "" ? null : Number(price),
    price_type: priceType,
    photos,
    action_type: actionType,
    action_config: config,
    custom_fields: fields,
  };

  const index = STEPS.indexOf(step);

  return (
    <div className="space-y-6">
      <StepHeader
        step={step}
        onSelect={(target) => {
          // Only steps already reached can be revisited from the header.
          if (STEPS.indexOf(target) < index) goTo(target);
        }}
      />

      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-ink scroll-mt-24 text-[18px] font-semibold tracking-[-0.01em] focus:outline-none"
        >
          {t(`steps.${step}`)}
        </h2>
        <p className="text-ink-muted mt-1 text-[14px]">{t(`stepHints.${step}`)}</p>
      </div>

      {/* Transforms are dropped under prefers-reduced-motion by MotionProvider;
          the cross-fade stays so the change of step is still visible. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 * direction }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "essentials" ? essentials : null}
          {step === "details" ? details : null}
          {step === "photos" ? photosSection : null}
          {step === "review" ? (
            <OfferReview draft={draft} currency={currency} locale={locale} onEdit={goTo} />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-5">
        {index > 0 ? (
          <Button type="button" variant="ghost" onClick={() => goTo(STEPS[index - 1])}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>
        ) : onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : (
          <span />
        )}

        {step === "review" ? (
          <Button type="button" onClick={submit} loading={pending}>
            <Check className="size-4" />
            {submitLabel ?? t("create")}
          </Button>
        ) : (
          <Button type="button" onClick={next}>
            {t("continue")}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="border-line border-b pb-3">
        <h2 className="text-ink text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-ink-muted mt-0.5 text-[13.5px]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function StepHeader({ step, onSelect }: { step: OfferStep; onSelect: (step: OfferStep) => void }) {
  const t = useTranslations("offers.form");
  const current = STEPS.indexOf(step);

  return (
    <ol className="flex gap-2" aria-label={t("progress")}>
      {STEPS.map((item, index) => {
        const done = index < current;
        return (
          <li key={item} className="flex-1">
            <button
              type="button"
              onClick={() => onSelect(item)}
              disabled={!done}
              aria-current={index === current ? "step" : undefined}
              className="w-full space-y-1.5 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors duration-300",
                  index <= current ? "bg-ink" : "bg-ink/10",
                )}
              />
              <span
                className={cn(
                  "block truncate text-[12px] font-medium transition-colors",
                  index <= current ? "text-ink" : "text-ink-subtle",
                  done && "hover:text-ink-muted",
                )}
              >
                {t(`steps.${item}`)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
