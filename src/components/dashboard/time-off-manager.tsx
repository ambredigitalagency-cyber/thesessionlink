"use client";

import { Plane, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addTimeOff, deleteTimeOff } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Entry = { id: string; starts_on: string; ends_on: string; label: string | null };

export function TimeOffManager({ entries, locale }: { entries: Entry[]; locale: string }) {
  const t = useTranslations("dashboard.availability");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const router = useRouter();
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!start || !end) return;

    startTransition(async () => {
      const result = await addTimeOff({ starts_on: start, ends_on: end, label: label || null });
      if (result.ok) {
        setAdding(false);
        setStart("");
        setEnd("");
        setLabel("");
        router.refresh();
      } else {
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  const format = (value: string) =>
    new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${value}T12:00:00Z`),
    );

  return (
    <div className="space-y-4">
      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="border-line bg-surface flex items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5"
            >
              <Plane className="text-ink-subtle size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-ink text-[14px] font-medium">
                  {format(entry.starts_on)}
                  {entry.ends_on !== entry.starts_on ? ` → ${format(entry.ends_on)}` : ""}
                </p>
                {entry.label ? (
                  <p className="text-ink-muted truncate text-[12.5px]">{entry.label}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteTimeOff(entry.id);
                    if (result.ok) {
                      router.refresh();
                    } else {
                      toast.error(tError(result.error as "unexpected"));
                    }
                  })
                }
                className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1.5 transition-colors"
                aria-label={tCommon("delete")}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <div className="border-line space-y-3 rounded-[var(--radius-md)] border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("from")}>
              <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            </Field>
            <Field label={t("to")}>
              <Input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => setEnd(event.target.value)}
              />
            </Field>
          </div>
          <Field label={t("timeOffLabel")} optional>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("timeOffLabelPlaceholder")}
              maxLength={80}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={submit} loading={pending} disabled={!start || !end}>
              {tCommon("add")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          {t("addTimeOff")}
        </Button>
      )}
    </div>
  );
}
