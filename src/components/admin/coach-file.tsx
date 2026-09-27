"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { addCoachNote, deleteCoachNote } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { notify } from "@/lib/notify";

/**
 * The client halves of a coach's file in the console: the reference chip,
 * which copies itself, and the internal notes.
 */

export function CoachRefChip({ value }: { value: string }) {
  const t = useTranslations("admin.coach");
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          notify.error(t("copyFailed"));
        }
      }}
      className="border-line text-ink-muted hover:border-ink/25 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[12px] tracking-wide transition-colors"
      title={t("copyRef")}
      aria-label={`${t("copyRef")} ${value}`}
    >
      {value}
      {copied ? (
        <Check className="text-success size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
    </button>
  );
}

export type CoachNote = {
  id: string;
  body: string;
  created_at: string;
  author: string;
  mine: boolean;
};

export function CoachNotes({ profileId, notes }: { profileId: string; notes: CoachNote[] }) {
  const t = useTranslations("admin.notes");
  const locale = useLocale();
  const tError = useTranslations("errors");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(value));

  function add() {
    startTransition(async () => {
      const result = await addCoachNote(profileId, draft);
      if (result.ok) {
        setDraft("");
        router.refresh();
      } else {
        notify.error(tError((result.error ?? "unexpected") as "unexpected"));
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCoachNote(id);
      if (result.ok) router.refresh();
      else notify.error(tError((result.error ?? "unexpected") as "unexpected"));
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Textarea
          rows={3}
          value={draft}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && draft.trim()) add();
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-subtle text-[12px]">{t("private")}</p>
          <Button size="sm" onClick={add} loading={pending} disabled={!draft.trim()}>
            {t("add")}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-ink-subtle text-[13px]">{t("empty")}</p>
      ) : (
        <ol className="divide-line border-line divide-y border-t">
          {notes.map((note) => (
            <li key={note.id} className="group flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-ink-subtle text-[12px]">
                  <span className="text-ink-muted font-medium">{note.author}</span> ·{" "}
                  <time dateTime={note.created_at}>{date(note.created_at)}</time>
                </p>
                <p className="text-ink mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">
                  {note.body}
                </p>
              </div>
              {note.mine ? (
                <button
                  type="button"
                  onClick={() => remove(note.id)}
                  disabled={pending}
                  className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1.5 opacity-60 transition-[opacity,color,background-color] group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={t("remove")}
                  title={t("remove")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
