"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { GalleryUpload } from "@/components/media/image-upload";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/field";
import {
  localized,
  type ActionType,
  type CategoryField,
  type FieldType,
  type OfferField,
} from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

const CUSTOM_TYPES: FieldType[] = ["text", "textarea", "number", "images"];

/** Builds the initial field list for a category + action type. */
export function suggestedFieldsFor(
  categoryFields: CategoryField[],
  actionType: ActionType,
  locale: string,
): OfferField[] {
  return categoryFields
    .filter((field) => !field.skip_for_actions?.includes(actionType))
    .map((field) => ({
      id: `suggested-${field.key}`,
      key: field.key,
      label: localized(field.label, locale, field.key),
      type: field.type,
      value: field.type === "images" ? [] : null,
      unit: field.unit ?? null,
      source: "suggested" as const,
    }));
}

/** Merges stored values with the current category suggestions. */
export function mergeSuggestions(
  existing: OfferField[],
  categoryFields: CategoryField[],
  actionType: ActionType,
  locale: string,
): OfferField[] {
  const suggestions = suggestedFieldsFor(categoryFields, actionType, locale);
  const byKey = new Map(existing.map((field) => [field.id, field]));

  const merged = suggestions.map((suggestion) => byKey.get(suggestion.id) ?? suggestion);
  const customs = existing.filter((field) => field.source === "custom");
  const orphans = existing.filter(
    (field) =>
      field.source === "suggested" &&
      !suggestions.some((suggestion) => suggestion.id === field.id) &&
      field.value !== null &&
      field.value !== "",
  );

  return [...merged, ...orphans, ...customs];
}

export function CustomFieldsEditor({
  fields,
  onChange,
  categoryFields,
  locale,
}: {
  fields: OfferField[];
  onChange: (fields: OfferField[]) => void;
  categoryFields: CategoryField[];
  locale: string;
}) {
  const t = useTranslations("offers.fields");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");

  function update(id: string, patch: Partial<OfferField>) {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function remove(id: string) {
    onChange(fields.filter((field) => field.id !== id));
  }

  function addCustom() {
    const label = newLabel.trim();
    if (!label) return;

    onChange([
      ...fields,
      {
        id: `custom-${crypto.randomUUID().slice(0, 8)}`,
        key:
          label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .slice(0, 40) || "field",
        label,
        type: newType,
        value: newType === "images" ? [] : null,
        source: "custom",
      },
    ]);

    setNewLabel("");
    setNewType("text");
  }

  return (
    <div className="space-y-4">
      {fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              categoryField={categoryFields.find((item) => item.key === field.key)}
              locale={locale}
              onChange={(patch) => update(field.id, patch)}
              onRemove={() => remove(field.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="border-line-strong rounded-[var(--radius-md)] border border-dashed p-4">
        <p className="text-ink text-[13px] font-medium">{t("addTitle")}</p>
        <p className="text-ink-muted mt-0.5 text-[12.5px]">{t("addHint")}</p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newLabel}
            placeholder={t("addPlaceholder")}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            className="sm:flex-1"
          />
          <NativeSelect
            value={newType}
            onChange={(event) => setNewType(event.target.value as FieldType)}
            className="sm:w-40"
          >
            {CUSTOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}` as "types.text")}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" variant="secondary" onClick={addCustom} disabled={!newLabel.trim()}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  categoryField,
  locale,
  onChange,
  onRemove,
}: {
  field: OfferField;
  categoryField?: CategoryField;
  locale: string;
  onChange: (patch: Partial<OfferField>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("offers.fields");
  const placeholder = categoryField?.placeholder
    ? localized(categoryField.placeholder, locale, "")
    : "";

  return (
    <div
      className={cn(
        "group border-line bg-surface relative rounded-[var(--radius-md)] border p-3.5",
        field.source === "custom" && "border-dashed",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="text-ink-subtle/60 mt-2 size-4 shrink-0" aria-hidden />

        <div className="min-w-0 flex-1 space-y-2">
          {field.source === "custom" ? (
            <Input
              value={field.label}
              onChange={(event) => onChange({ label: event.target.value })}
              className="h-9 text-[13px] font-medium"
              aria-label={t("labelAria")}
            />
          ) : (
            <p className="text-ink text-[13px] font-medium">
              {field.label}
              {field.unit ? (
                <span className="text-ink-subtle ml-1 text-[12px] font-normal">({field.unit})</span>
              ) : null}
            </p>
          )}

          <FieldControl
            field={field}
            categoryField={categoryField}
            locale={locale}
            placeholder={placeholder}
            onChange={onChange}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t("removeField", { label: field.label })}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  categoryField,
  locale,
  placeholder,
  onChange,
}: {
  field: OfferField;
  categoryField?: CategoryField;
  locale: string;
  placeholder: string;
  onChange: (patch: Partial<OfferField>) => void;
}) {
  const t = useTranslations("offers.fields");

  if (field.type === "images") {
    return (
      <GalleryUpload
        value={Array.isArray(field.value) ? field.value : []}
        onChange={(urls) => onChange({ value: urls })}
      />
    );
  }

  if (field.type === "select" && categoryField?.options) {
    return (
      <NativeSelect
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => onChange({ value: event.target.value || null })}
        className="h-10"
      >
        <option value="">{t("choose")}</option>
        {categoryField.options.map((option) => {
          const label = localized(option.label, locale, option.value);
          return (
            <option key={option.value} value={label}>
              {label}
            </option>
          );
        })}
      </NativeSelect>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        rows={3}
        value={typeof field.value === "string" ? field.value : ""}
        placeholder={placeholder}
        onChange={(event) => onChange({ value: event.target.value || null })}
      />
    );
  }

  if (field.type === "number") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        className="h-10"
        value={typeof field.value === "number" ? field.value : ""}
        placeholder={placeholder}
        onChange={(event) =>
          onChange({ value: event.target.value === "" ? null : Number(event.target.value) })
        }
      />
    );
  }

  return (
    <Input
      className="h-10"
      value={typeof field.value === "string" ? field.value : ""}
      placeholder={placeholder}
      onChange={(event) => onChange({ value: event.target.value || null })}
    />
  );
}
