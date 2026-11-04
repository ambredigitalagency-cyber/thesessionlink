"use client";

import { ArrowRight, ListChecks, X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import type { EditorBlock } from "@/actions/page";

import { BlockGlyph } from "./block-meta";

/**
 * The blocks the sign-up added for the trade, still to complete — at the top
 * of "Ma page", the first thing seen after the sign-up.
 *
 * Small on purpose: a line of progress and one row per block, each opening it
 * in the list below. It can be hidden (remembered on this device only — it is
 * a convenience, and the "to complete" mark on each block stays regardless),
 * and it leaves on its own once nothing is left to complete.
 */
export function TodoList({
  blocks,
  profileId,
  onOpen,
}: {
  blocks: EditorBlock[];
  profileId: string;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("page.editor.todo");
  const tBlocks = useTranslations("page.blocks");
  const key = `tsl:todo-hidden:${profileId}`;
  const hidden = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );

  const suggested = blocks.filter((block) => block.suggested);
  const remaining = suggested.filter((block) => block.pending);
  if (remaining.length === 0) return null;

  const done = suggested.length - remaining.length;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => write(key, false)}
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] underline underline-offset-4 transition-colors"
      >
        <ListChecks className="size-4" aria-hidden />
        {t("show", { count: remaining.length })}
      </button>
    );
  }

  return (
    <section
      aria-labelledby="todo-title"
      className="rise-in border-line bg-surface rounded-[var(--radius-md)] border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="todo-title" className="text-ink text-[14.5px] font-semibold">
            {t("title")}
          </h2>
          <p className="text-ink-muted mt-0.5 text-[12.5px] leading-relaxed">{t("hint")}</p>
        </div>
        <button
          type="button"
          onClick={() => write(key, true)}
          aria-label={t("hide")}
          title={t("hide")}
          className="text-ink-subtle hover:text-ink -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={suggested.length}
          aria-valuenow={done}
          aria-label={t("progress", { done, total: suggested.length })}
          className="bg-ink/[0.07] h-1.5 flex-1 overflow-hidden rounded-full"
        >
          <motion.div
            className="h-full rounded-full bg-[var(--color-brand)]"
            initial={false}
            animate={{ width: `${(done / suggested.length) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-ink-muted shrink-0 text-[12px] tabular-nums">
          {t("progress", { done, total: suggested.length })}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {remaining.map((block) => {
          const name = tBlocks(`${block.type}.title`);
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => onOpen(block.id)}
                aria-label={t("open", { name })}
                className="hover:bg-canvas group flex w-full items-center gap-3 rounded-[var(--radius-sm)] p-1.5 text-left transition-colors"
              >
                <BlockGlyph type={block.type} size="sm" />
                <span className="text-ink min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {name}
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-ink-subtle size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* Remembered per device: a hidden list is a convenience, never a setting. */
const EVENT = "tsl:todo-hidden";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string, hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the list simply stays as it is.
  }
  window.dispatchEvent(new Event(EVENT));
}
