"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDot,
  Clock,
  Hash,
  Images,
  ListChecks,
  Plus,
  ToggleRight,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { GalleryUpload } from "@/components/media/image-upload";
import { Button } from "@/components/ui/button";
import { ChoiceChips, ChoiceGroup, chipClass } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  FIELD_LIMITS,
  FIELD_TYPES,
  availableSuggestions,
  createField,
  fieldFromSuggestion,
  newFieldId,
  type FieldType,
  type OfferField,
  type OfferFieldOf,
  type TimeRange,
} from "@/lib/offers/fields";
import { localized, type ActionType, type CategoryField } from "@/lib/offers/schema";

export const FIELD_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  number: Hash,
  select: CircleDot,
  multiselect: ListChecks,
  boolean: ToggleRight,
  time: Clock,
  images: Images,
};

const iconButtonClass =
  "text-ink-subtle hover:bg-ink/5 hover:text-ink rounded-full p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30";

/**
 * The free-field editor: the pro adds the fields they want, of the type they
 * want, configures them and fills them in. Nothing is pre-added.
 *
 * Used by step 2 of the offer builder, where the category offers one-click
 * suggestions, and by the client record, where it is used without them.
 *
 * `errors` uses the server's keys (`custom_fields.<index>.<path>`), so client
 * and server validation land in the same place.
 */
export function CustomFieldsEditor({
  fields,
  onChange,
  suggestions = [],
  actionType,
  locale,
  errors,
}: {
  fields: OfferField[];
  onChange: (fields: OfferField[]) => void;
  /** Category suggestions; omitted outside the offer builder. */
  suggestions?: CategoryField[];
  actionType?: ActionType;
  locale: string;
  errors: Record<string, string>;
}) {
  const t = useTranslations("offers.fields");
  const [picking, setPicking] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const full = fields.length >= FIELD_LIMITS.fields;
  const ideas = actionType ? availableSuggestions(suggestions, fields, actionType, locale) : [];

  function add(field: OfferField) {
    onChange([...fields, field]);
    setFocusId(field.id);
    setPicking(false);
  }

  function update(index: number, next: OfferField) {
    onChange(fields.map((field, position) => (position === index ? next : field)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="border-line-strong rounded-[var(--radius-md)] border border-dashed px-5 py-6 text-center">
          <p className="text-ink text-[14px] font-medium">{t("emptyTitle")}</p>
          <p className="text-ink-muted mx-auto mt-1 max-w-sm text-[13px] leading-relaxed">
            {t("emptyHint")}
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id}>
              <FieldCard
                field={field}
                index={index}
                count={fields.length}
                locale={locale}
                autoFocus={field.id === focusId}
                errors={errors}
                onChange={(next) => update(index, next)}
                onMove={(delta) => move(index, index + delta)}
                onRemove={() => onChange(fields.filter((_, position) => position !== index))}
              />
            </li>
          ))}
        </ol>
      )}

      {picking ? (
        // Seven kinds of field, laid out as seven pictograms. Nothing is
        // selected when the question opens, so a tap is the answer *and* the
        // move on: the field is added and the panel closes in one go.
        <div className="border-line-strong rounded-[var(--radius-md)] border p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-ink text-[14px] font-medium">{t("pickType")}</p>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className={iconButtonClass}
              aria-label={t("cancelPick")}
            >
              <X className="size-4" />
            </button>
          </div>
          <ChoiceGroup
            name="field-type"
            label={t("pickType")}
            className="mt-3"
            columns={2}
            value={null}
            onChange={(type) => add(createField(type))}
            options={FIELD_TYPES.map((type) => {
              const Icon = FIELD_ICONS[type];
              return {
                value: type,
                title: t(`types.${type}.name`),
                description: t(`types.${type}.hint`),
                visual: <Icon className="size-4" aria-hidden />,
              };
            })}
          />
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setPicking(true)} disabled={full}>
          <Plus className="size-4" />
          {t("add")}
        </Button>
      )}

      {full ? (
        <p className="text-ink-subtle text-[12.5px]">{t("limit", { max: FIELD_LIMITS.fields })}</p>
      ) : null}

      {ideas.length > 0 && !full ? (
        <div className="space-y-2 pt-1">
          <p className="text-ink-muted text-[12.5px]">{t("ideas")}</p>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <button
                key={idea.key}
                type="button"
                className={chipClass(false)}
                onClick={() => add(fieldFromSuggestion(idea, locale))}
              >
                <Plus className="size-3.5" />
                {localized(idea.label, locale, idea.key)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldCard({
  field,
  index,
  count,
  locale,
  autoFocus,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  field: OfferField;
  index: number;
  count: number;
  locale: string;
  autoFocus: boolean;
  errors: Record<string, string>;
  onChange: (field: OfferField) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("offers.fields");
  const tError = useTranslations("errors");
  const Icon = FIELD_ICONS[field.type];
  const prefix = `custom_fields.${index}`;
  const errorFor = (path: string) => {
    const code = errors[`${prefix}.${path}`];
    return code ? tError(code as "unexpected") : null;
  };
  const name = field.definition.label || t(`types.${field.type}.name`);

  return (
    <div className="border-line bg-surface rounded-[var(--radius-md)] border p-4">
      <div className="flex items-center gap-2">
        <span className="bg-ink/5 text-ink-muted flex size-7 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-3.5" />
        </span>
        <span className="text-ink-subtle text-[12px] font-medium tracking-[0.06em] uppercase">
          {t(`types.${field.type}.name`)}
        </span>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className={iconButtonClass}
            aria-label={t("moveUp", { label: name })}
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            className={iconButtonClass}
            aria-label={t("moveDown", { label: name })}
          >
            <ArrowDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1.5 transition-colors"
            aria-label={t("remove", { label: name })}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        <Field label={t("label")} error={errorFor("definition.label")}>
          <Input
            value={field.definition.label}
            onChange={(event) =>
              onChange({
                ...field,
                definition: { ...field.definition, label: event.target.value },
              } as OfferField)
            }
            placeholder={t(`types.${field.type}.placeholder`)}
            maxLength={FIELD_LIMITS.label}
            autoFocus={autoFocus}
          />
        </Field>

        <DefinitionControls field={field} onChange={onChange} errorFor={errorFor} />

        <Field label={t("value")} hint={t("valueHint")} error={errorFor("value")} optional>
          <ValueControl field={field} locale={locale} onChange={onChange} />
        </Field>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Definition — what the field is                                              */
/* -------------------------------------------------------------------------- */

function DefinitionControls({
  field,
  onChange,
  errorFor,
}: {
  field: OfferField;
  onChange: (field: OfferField) => void;
  errorFor: (path: string) => string | null;
}) {
  const t = useTranslations("offers.fields");

  switch (field.type) {
    case "text":
      // Two named shapes rather than a switch labelled "long text": "short"
      // and "long" are both answers, where a switch makes one of them the
      // absence of the other.
      return (
        <Field label={t("textFormat")} hint={t("multilineHint")}>
          <ChoiceChips
            label={t("textFormat")}
            value={field.definition.multiline ? "long" : "short"}
            onChange={(mode) =>
              onChange({
                ...field,
                definition: { ...field.definition, multiline: mode === "long" },
              })
            }
            options={[
              { value: "short", label: t("textShort") },
              { value: "long", label: t("textLong") },
            ]}
          />
        </Field>
      );

    case "number":
      return (
        <Field label={t("unit")} hint={t("unitHint")} optional>
          <Input
            value={field.definition.unit ?? ""}
            onChange={(event) =>
              onChange({
                ...field,
                definition: { ...field.definition, unit: event.target.value || null },
              })
            }
            placeholder={t("unitPlaceholder")}
            maxLength={FIELD_LIMITS.unit}
            className="sm:max-w-40"
          />
        </Field>
      );

    case "select":
    case "multiselect":
      return <OptionsEditor field={field} onChange={onChange} errorFor={errorFor} />;

    case "time":
      return (
        <Field label={t("timeMode")}>
          <ChoiceChips
            label={t("timeMode")}
            value={field.definition.mode}
            onChange={(mode) =>
              onChange({ ...field, definition: { ...field.definition, mode }, value: null })
            }
            options={[
              { value: "range", label: t("timeRange") },
              { value: "duration", label: t("timeDuration") },
            ]}
          />
        </Field>
      );

    default:
      return null;
  }
}

function OptionsEditor({
  field,
  onChange,
  errorFor,
}: {
  field: OfferFieldOf<"select"> | OfferFieldOf<"multiselect">;
  onChange: (field: OfferField) => void;
  errorFor: (path: string) => string | null;
}) {
  const t = useTranslations("offers.fields");
  const options = field.definition.options;

  function setOptions(next: typeof options) {
    const ids = new Set(next.map((option) => option.id));
    // A removed option can no longer be the chosen one.
    const value =
      field.type === "select"
        ? field.value && ids.has(field.value)
          ? field.value
          : null
        : field.value.filter((id) => ids.has(id));
    onChange({ ...field, definition: { ...field.definition, options: next }, value } as OfferField);
  }

  const listError = errorFor("definition.options");

  return (
    <div className="space-y-2">
      <p className="text-ink text-[13.5px] font-medium">{t("options")}</p>
      <ul className="space-y-2">
        {options.map((option, index) => {
          const error = errorFor(`definition.options.${index}.label`);
          return (
            <li key={option.id}>
              <div className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(event) =>
                    setOptions(
                      options.map((item) =>
                        item.id === option.id ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder={t("optionPlaceholder", { number: index + 1 })}
                  maxLength={FIELD_LIMITS.optionLabel}
                  aria-invalid={Boolean(error)}
                  aria-label={t("optionAria", { number: index + 1 })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (options.length < FIELD_LIMITS.options) {
                        setOptions([...options, { id: newFieldId("o"), label: "" }]);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((item) => item.id !== option.id))}
                  disabled={options.length === 1}
                  className={iconButtonClass}
                  aria-label={t("removeOption", { label: option.label || index + 1 })}
                >
                  <X className="size-4" />
                </button>
              </div>
              {error ? <p className="text-danger mt-1 text-[12.5px]">{error}</p> : null}
            </li>
          );
        })}
      </ul>
      {options.length < FIELD_LIMITS.options ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOptions([...options, { id: newFieldId("o"), label: "" }])}
        >
          <Plus className="size-3.5" />
          {t("addOption")}
        </Button>
      ) : null}
      {listError ? (
        <p className="text-danger text-[12.5px]">{listError}</p>
      ) : (
        <p className="text-ink-subtle text-[12.5px]">
          {t("optionsHint", { max: FIELD_LIMITS.options })}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Value — what the pro fills in                                               */
/* -------------------------------------------------------------------------- */

function ValueControl({
  field,
  locale,
  onChange,
}: {
  field: OfferField;
  locale: string;
  onChange: (field: OfferField) => void;
}) {
  const t = useTranslations("offers.fields");
  const tCommon = useTranslations("common");

  switch (field.type) {
    case "text":
      return field.definition.multiline ? (
        <Textarea
          rows={4}
          value={field.value ?? ""}
          maxLength={FIELD_LIMITS.longText}
          onChange={(event) => onChange({ ...field, value: event.target.value || null })}
        />
      ) : (
        <Input
          value={field.value ?? ""}
          maxLength={FIELD_LIMITS.shortText}
          onChange={(event) => onChange({ ...field, value: event.target.value || null })}
        />
      );

    case "number":
      return (
        <div className="flex gap-2 sm:max-w-60">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={field.value ?? ""}
            onChange={(event) =>
              onChange({
                ...field,
                value: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          {field.definition.unit ? (
            <span className="border-line-strong text-ink-muted flex h-11 shrink-0 items-center rounded-[var(--radius-sm)] border px-3 text-[14px]">
              {field.definition.unit}
            </span>
          ) : null}
        </div>
      );

    case "select": {
      const options = field.definition.options.filter((option) => option.label.trim());
      if (options.length === 0) {
        return <p className="text-ink-subtle text-[13px]">{t("optionsFirst")}</p>;
      }
      // The pro just wrote these choices a few centimetres above; asking them
      // to reopen a menu to find one of them again is the wrong shape.
      return (
        <ChoiceChips
          label={field.definition.label || t("types.select.name")}
          value={field.value}
          onChange={(id) => onChange({ ...field, value: id })}
          onClear={() => onChange({ ...field, value: null })}
          clearLabel={t("clearAnswer")}
          options={options.map((option) => ({ value: option.id, label: option.label }))}
        />
      );
    }

    case "multiselect": {
      const options = field.definition.options.filter((option) => option.label.trim());
      if (options.length === 0) {
        return <p className="text-ink-subtle text-[13px]">{t("optionsFirst")}</p>;
      }
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const checked = field.value.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={chipClass(checked)}
                onClick={() =>
                  onChange({
                    ...field,
                    // Keep the order of the options, not the order of the clicks.
                    value: field.definition.options
                      .map((item) => item.id)
                      .filter((id) => (id === option.id ? !checked : field.value.includes(id))),
                  })
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "boolean":
      // Two explicit answers rather than a switch: a switch has no "not
      // answered yet" position, and an unanswered field must stay hidden.
      return (
        <ChoiceChips
          label={field.definition.label || t("types.boolean.name")}
          value={field.value === null ? null : field.value ? "yes" : "no"}
          onChange={(answer) => onChange({ ...field, value: answer === "yes" })}
          onClear={() => onChange({ ...field, value: null })}
          clearLabel={t("clearAnswer")}
          options={[
            { value: "yes", label: tCommon("yes"), icon: <Check className="size-3.5" /> },
            { value: "no", label: tCommon("no"), icon: <X className="size-3.5" /> },
          ]}
        />
      );

    case "time":
      return field.definition.mode === "range" ? (
        <TimeRangeInput
          key={`${field.id}-range`}
          value={field.value && "start" in field.value ? field.value : null}
          onChange={(value) => onChange({ ...field, value })}
        />
      ) : (
        <DurationInput
          key={`${field.id}-duration`}
          minutes={field.value && "minutes" in field.value ? field.value.minutes : null}
          locale={locale}
          onChange={(minutes) => onChange({ ...field, value: minutes ? { minutes } : null })}
        />
      );

    case "images":
      return (
        <GalleryUpload
          value={field.value}
          max={FIELD_LIMITS.images}
          onChange={(urls) => onChange({ ...field, value: urls })}
        />
      );
  }
}

/**
 * Keeps half-typed input locally: the field only gets a value once both ends
 * are set, but the pro must still see what they typed.
 */
function TimeRangeInput({
  value,
  onChange,
}: {
  value: TimeRange | null;
  onChange: (value: TimeRange | null) => void;
}) {
  const t = useTranslations("offers.fields");
  const [start, setStart] = useState(value?.start ?? "");
  const [end, setEnd] = useState(value?.end ?? "");
  // The first input takes the Field's id; the second needs its own.
  const endId = useId();

  function commit(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    onChange(nextStart && nextEnd ? { start: nextStart, end: nextEnd } : null);
  }

  return (
    <div className="flex items-center gap-2 sm:max-w-80">
      <Input
        type="time"
        value={start}
        onChange={(event) => commit(event.target.value, end)}
        aria-label={t("timeStart")}
      />
      <span className="text-ink-subtle">–</span>
      <Input
        type="time"
        id={endId}
        value={end}
        onChange={(event) => commit(start, event.target.value)}
        aria-label={t("timeEnd")}
      />
    </div>
  );
}

function DurationInput({
  minutes,
  locale,
  onChange,
}: {
  minutes: number | null;
  locale: string;
  onChange: (minutes: number | null) => void;
}) {
  const t = useTranslations("offers.fields");
  const [hours, setHours] = useState(minutes ? String(Math.floor(minutes / 60)) : "");
  const [rest, setRest] = useState(minutes ? String(minutes % 60) : "");
  const minutesId = useId();

  function commit(nextHours: string, nextRest: string) {
    setHours(nextHours);
    setRest(nextRest);
    const total = (Number(nextHours) || 0) * 60 + (Number(nextRest) || 0);
    onChange(total > 0 ? Math.round(total) : null);
  }

  return (
    <div className="flex items-center gap-2 sm:max-w-80" lang={locale}>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={168}
        value={hours}
        onChange={(event) => commit(event.target.value, rest)}
        aria-label={t("hours")}
      />
      <span className="text-ink-muted text-[14px]">{t("hoursShort")}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        id={minutesId}
        value={rest}
        onChange={(event) => commit(hours, event.target.value)}
        aria-label={t("minutes")}
      />
      <span className="text-ink-muted text-[14px]">{t("minutesShort")}</span>
    </div>
  );
}
