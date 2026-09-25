"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { createOffer, updateOffer } from "@/actions/offers";
import { OfferPhotosUpload } from "@/components/media/offer-photos-upload";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhaseField, PhaseQuestion, PhaseSwitch } from "@/components/ui/phase";
import { ToggleRow } from "@/components/ui/primitives";
import { StepProgress } from "@/components/ui/step-progress";
import { notify } from "@/lib/notify";
import { offerFieldsSchema, type OfferField } from "@/lib/offers/fields";
import {
  defaultActionConfig,
  parseActionConfig,
  type ActionType,
  type AnyActionConfig,
  type CategoryField,
} from "@/lib/offers/schema";
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

/**
 * The four stages of the journey, which is what the progress bar names.
 * Unchanged: they are the shape of an offer, and the single-page editor still
 * draws one section per stage.
 */
const STEPS = ["essentials", "details", "photos", "review"] as const;
export type OfferStep = (typeof STEPS)[number];

/**
 * The questions the builder actually asks, in order.
 *
 * "Essentials" used to be one screen carrying the title, the description, the
 * price, the choice between five action types and every setting belonging to
 * whichever one was picked — thirty-odd controls, most of them irrelevant
 * until the action type was decided. It is now three questions: what happens
 * when someone clicks, what you are selling, and how that action behaves. The
 * first one comes first because it decides what the other two even mean.
 *
 * The progress bar keeps naming four stages — six labels do not fit a phone
 * and the journey really is four — and moves a third of a stage per answer
 * instead of standing still for three screens. Same bar, same component, finer
 * resolution.
 */
const PHASES = ["action", "basics", "settings", "details", "photos", "review"] as const;
export type OfferPhase = (typeof PHASES)[number];

const PHASE_STEP: Record<OfferPhase, OfferStep> = {
  action: "essentials",
  basics: "essentials",
  settings: "essentials",
  details: "details",
  photos: "photos",
  review: "review",
};

const PRICE_TYPES = ["fixed", "from", "free", "on_request"] as const;
type PriceType = (typeof PRICE_TYPES)[number];

/** Which question owns an error key, so a rejected save lands on it. */
function phaseForError(key: string): OfferPhase {
  if (key.startsWith("custom_fields")) return "details";
  if (key.startsWith("photos")) return "photos";
  if (key.startsWith("action_config")) return "settings";
  return "basics";
}

/** The first question of a stage, for the jumps the progress bar allows. */
function firstPhaseOf(step: OfferStep): OfferPhase {
  return PHASES.find((phase) => PHASE_STEP[phase] === step) ?? "action";
}

type Props = {
  mode: "create" | "edit";
  /**
   * Creating walks through the questions and ends on a review; editing an
   * offer that already exists shows every section on one page, so a small
   * change is one scroll and one save.
   */
  layout: "wizard" | "sections";
  categoryFields: CategoryField[];
  suggestedActionType?: ActionType | null;
  currency: string;
  locale: string;
  profileWhatsapp?: string | null;
  /** True when the coach has a gateway connected and cleared to charge. */
  gatewayReady?: boolean;
  /**
   * Draws the progress bar, given how far through the questions we are (0-1).
   *
   * Onboarding uses it to feed its own four-step bar instead: the wizard is
   * step 3 of a longer journey there, and two progress bars stacked on one
   * screen tell the coach less than one bar does, not more.
   */
  progress?: (ratio: number) => ReactNode;
  /** 1 when the wizard owns the page, 2 when it sits under a page title. */
  headingLevel?: 1 | 2;
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
  gatewayReady = false,
  progress,
  headingLevel = 2,
  initial,
  submitLabel,
  onSaved,
  onCancel,
}: Props) {
  const t = useTranslations("offers.form");
  const tError = useTranslations("errors");

  const startingActionType =
    initial?.action_type ?? suggestedActionType ?? ("calendar_booking" as ActionType);

  const [phase, setPhase] = useState<OfferPhase>("action");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceType, setPriceType] = useState<PriceType>(initial?.price_type ?? "fixed");
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

  /** The same rules the server applies, run before leaving the question. */
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
   * Once a question has been refused, re-check it on every keystroke so a
   * fixed field clears its message there and then. Waiting for the next
   * "Continue" to say "that is fine now" was tolerable in a long form; on a
   * screen holding one question it reads as the answer still being wrong.
   */
  function clearEssentialError(key: "title" | "price") {
    setErrors((current) => {
      if (!current[key]) return current;
      return Object.fromEntries(Object.entries(current).filter(([name]) => name !== key));
    });
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

  function goTo(target: OfferPhase) {
    setDirection(PHASES.indexOf(target) >= PHASES.indexOf(phase) ? 1 : -1);
    setPhase(target);
    // Move focus with the question, so keyboard and screen reader users follow.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function next() {
    if (phase === "basics" && Object.keys(validate("essentials")).length > 0) return;
    if (phase === "details" && Object.keys(validate("details")).length > 0) return;
    goTo(PHASES[PHASES.indexOf(phase) + 1]);
  }

  function submit() {
    const firstError = Object.keys(validate("all"))[0];
    if (firstError) {
      if (layout === "wizard") goTo(phaseForError(firstError));
      notify.error(tError("form_has_errors"));
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
        notify.success(t(mode === "edit" ? "updated" : "created"));
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
        if (first && layout === "wizard") goTo(phaseForError(first));
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  const priceChips = (
    <ChoiceChips
      label={t("priceType")}
      value={priceType}
      onChange={setPriceType}
      options={PRICE_TYPES.map((type) => ({
        value: type,
        label: t(
          type === "on_request"
            ? "priceOnRequest"
            : type === "fixed"
              ? "priceFixed"
              : type === "from"
                ? "priceFrom"
                : "priceFree",
        ),
      }))}
    />
  );

  const titleField = (
    <Field label={t("title")} error={errorFor("title")}>
      <Input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          clearEssentialError("title");
        }}
        placeholder={t("titlePlaceholder")}
        maxLength={120}
        autoFocus={mode === "create" && layout === "wizard"}
        className={layout === "wizard" ? "h-13 rounded-[var(--radius-sm)] text-[17px]" : undefined}
      />
    </Field>
  );

  const descriptionField = (
    <Field label={t("description")} hint={t("descriptionHint")} optional>
      <Textarea
        rows={4}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={t("descriptionPlaceholder")}
        maxLength={5000}
      />
    </Field>
  );

  const priceField = (
    <div className="space-y-4">
      <Field label={t("priceType")}>{priceChips}</Field>

      {priceType === "free" || priceType === "on_request" ? null : (
        <Field label={t("price")} error={errorFor("price")}>
          <div className="flex gap-2 sm:max-w-60">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                clearEssentialError("price");
              }}
              placeholder="0"
            />
            <span className="border-line-strong text-ink-muted flex h-11 items-center rounded-[var(--radius-sm)] border px-3 text-[14px]">
              {currency}
            </span>
          </div>
        </Field>
      )}
    </div>
  );

  const settingsSection = (
    <ActionConfigFields
      actionType={actionType}
      config={config}
      locale={locale}
      profileWhatsapp={profileWhatsapp}
      payments={{
        gatewayReady,
        // A price the client can act on: a firm number, not "from" and not
        // "on request". Read live, so switching the price type off a firm
        // amount closes the payment options in the same breath.
        priceIsFirm: priceType === "fixed" && price !== "" && Number(price) > 0,
      }}
      onChange={(nextConfig) => setConfigs((current) => ({ ...current, [actionType]: nextConfig }))}
    />
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

  const photosSection = <OfferPhotosUpload value={photos} onChange={setPhotos} />;

  /* ---------------------------------------------------------------------- */
  /* Editing: every section on one page                                      */
  /* ---------------------------------------------------------------------- */

  if (layout === "sections") {
    return (
      <div className="space-y-10">
        <FormSection title={t("steps.essentials")} hint={t("stepHints.essentials")}>
          <div className="space-y-5">
            {titleField}
            {descriptionField}
            {priceField}
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
              {settingsSection}
            </section>
          </div>
        </FormSection>

        <FormSection title={t("steps.details")} hint={t("stepHints.details")}>
          {details}
        </FormSection>

        <FormSection title={t("steps.photos")} hint={t("stepHints.photos")}>
          <Field label={t("photos")} hint={t("photosHint")} optional>
            {photosSection}
          </Field>
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

  /* ---------------------------------------------------------------------- */
  /* Creating: one question at a time                                        */
  /* ---------------------------------------------------------------------- */

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

  const step = PHASE_STEP[phase];
  const stepIndex = STEPS.indexOf(step);
  const siblings = PHASES.filter((item) => PHASE_STEP[item] === step);
  const index = PHASES.indexOf(phase);

  return (
    <div className="space-y-7">
      {progress ? (
        progress((index + 1) / PHASES.length)
      ) : (
        <StepProgress
          label={t("progress")}
          steps={STEPS.map((item) => t(`steps.${item}`))}
          current={stepIndex}
          advance={(siblings.indexOf(phase) + 1) / siblings.length}
          onSelect={(target) => {
            // Only stages already reached can be revisited from the bar.
            if (target < stepIndex) goTo(firstPhaseOf(STEPS[target]));
          }}
        />
      )}

      <PhaseSwitch phase={phase} direction={direction} className="space-y-6">
        <PhaseQuestion
          ref={headingRef}
          level={headingLevel}
          title={t(`phases.${phase}.title`)}
          hint={t(`phases.${phase}.hint`)}
        />

        {phase === "action" ? (
          <ActionTypePicker
            value={actionType}
            onChange={changeActionType}
            suggested={suggestedActionType}
            size="question"
          />
        ) : null}

        {phase === "basics" ? (
          <div className="space-y-3">
            <PhaseField index={0}>{titleField}</PhaseField>
            <PhaseField index={1}>{descriptionField}</PhaseField>
            <PhaseField index={2}>{priceField}</PhaseField>
          </div>
        ) : null}

        {phase === "settings" ? <PhaseField>{settingsSection}</PhaseField> : null}
        {phase === "details" ? details : null}
        {phase === "photos" ? photosSection : null}
        {phase === "review" ? (
          <OfferReview draft={draft} currency={currency} locale={locale} onEdit={goTo} />
        ) : null}
      </PhaseSwitch>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-5">
        {index > 0 ? (
          <Button type="button" variant="ghost" onClick={() => goTo(PHASES[index - 1])}>
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

        {phase === "review" ? (
          <Button type="button" size="lg" onClick={submit} loading={pending}>
            <Check className="size-4" />
            {submitLabel ?? t("create")}
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={next}>
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
