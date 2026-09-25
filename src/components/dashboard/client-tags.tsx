"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { setClientTags } from "@/actions/clients";
import { Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { notify } from "@/lib/notify";
import { normaliseTags, TAG_LIMITS } from "@/lib/crm/segments";
import { cn } from "@/lib/utils";

/**
 * Tags on a client record. The coach types a word; the words they already used
 * on other clients are offered underneath, so a vocabulary settles on its own
 * without a management screen.
 */
export function ClientTags({
  clientId,
  tags,
  vocabulary,
}: {
  clientId: string;
  tags: string[];
  /** Tags already used on this coach's other clients. */
  vocabulary: string[];
}) {
  const t = useTranslations("dashboard.clients");
  const tError = useTranslations("errors");

  const [current, setCurrent] = useState(tags);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const suggestions = vocabulary.filter((tag) => !current.includes(tag)).slice(0, 8);
  const full = current.length >= TAG_LIMITS.perClient;

  function save(next: string[]) {
    const cleaned = normaliseTags(next);
    const previous = current;
    setCurrent(cleaned);

    startTransition(async () => {
      const result = await setClientTags(clientId, cleaned);
      if (!result.ok) {
        setCurrent(previous);
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {current.length === 0 ? (
          <p className="text-ink-subtle text-[13px]">{t("tagsEmpty")}</p>
        ) : (
          current.map((tag) => (
            <span
              key={tag}
              className="border-line-strong text-ink-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-[13px] font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => save(current.filter((item) => item !== tag))}
                disabled={pending}
                className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1 transition-colors"
                aria-label={t("tagRemove", { tag })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex gap-2 sm:max-w-sm">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (!draft.trim() || full) return;
            save([...current, draft]);
            setDraft("");
          }}
          placeholder={t("tagPlaceholder")}
          maxLength={TAG_LIMITS.length}
          disabled={full}
          aria-label={t("tagAdd")}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim() || full) return;
            save([...current, draft]);
            setDraft("");
          }}
          disabled={!draft.trim() || full}
          className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3.5 text-[13.5px] font-medium transition-colors disabled:opacity-40"
        >
          <Plus className="size-4" />
          {t("tagAdd")}
        </button>
      </div>

      {suggestions.length > 0 && !full ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-subtle text-[12.5px]">{t("tagsReuse")}</span>
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => save([...current, tag])}
              className={cn(
                "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink rounded-full border px-2.5 py-1 text-[12.5px] transition-colors",
              )}
            >
              + {tag}
            </button>
          ))}
        </div>
      ) : null}

      {full ? (
        <p className="text-ink-subtle text-[12.5px]">
          {t("tagsLimit", { max: TAG_LIMITS.perClient })}
        </p>
      ) : null}
    </div>
  );
}

/** The automatic badges, shown next to the coach's own tags. */
export function SegmentBadges({ segments }: { segments: string[] }) {
  const t = useTranslations("dashboard.clients");
  if (segments.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {segments.map((segment) => (
        <Badge key={segment} tone={segment === "inactive" ? "neutral" : "accent"}>
          {t(`segments.${segment}` as "segments.loyal")}
        </Badge>
      ))}
    </span>
  );
}
