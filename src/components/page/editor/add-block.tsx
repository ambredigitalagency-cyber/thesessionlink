"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type CSSProperties } from "react";

import { Modal } from "@/components/ui/overlays";
import type { BlockType } from "@/lib/page/blocks";
import { blocksFor } from "@/lib/page/suggestions";
import { ACTION_ICONS } from "@/lib/offers/meta";
import type { ActionType } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

import { BlockGlyph } from "./block-meta";

export type OfferChoice = { id: string; title: string; action_type: ActionType; onPage: boolean };

/**
 * The library: the blocks a coach of this trade reaches for first, then all
 * of them. One tap adds the block and opens it for filling in. A service
 * asks one more question — which offer — on the same window.
 */
export function AddBlockDialog({
  open,
  onOpenChange,
  categorySlug,
  offers,
  full,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySlug: string | null;
  offers: OfferChoice[];
  full: boolean;
  onAdd: (type: BlockType, offerId?: string) => Promise<void>;
}) {
  const t = useTranslations("page.add");
  const [step, setStep] = useState<"library" | "offer">("library");
  const [adding, setAdding] = useState<string | null>(null);
  const { suggested, others } = blocksFor(categorySlug);

  async function add(type: BlockType, offerId?: string) {
    if (type === "service" && !offerId) {
      setStep("offer");
      return;
    }
    setAdding(offerId ?? type);
    try {
      await onAdd(type, offerId);
    } finally {
      setAdding(null);
      setStep("library");
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStep("library");
      }}
      title={step === "library" ? t("title") : t("offerTitle")}
      description={step === "library" ? t("subtitle") : t("offerSubtitle")}
      size="lg"
    >
      {full ? (
        <p className="bg-warning-soft text-warning rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[13.5px]">
          {t("full")}
        </p>
      ) : step === "library" ? (
        <div className="space-y-6">
          <section>
            <h3 className="text-ink mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold">
              <Sparkles className="size-3.5 text-[var(--color-brand)]" aria-hidden />
              {t("suggested")}
            </h3>
            <Grid types={suggested} adding={adding} onPick={add} />
          </section>
          <section>
            <h3 className="text-ink mb-2.5 text-[13px] font-semibold">{t("all")}</h3>
            <Grid types={others} adding={adding} onPick={add} offset={suggested.length} />
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStep("library")}
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("back")}
          </button>
          {offers.length === 0 ? (
            <p className="text-ink-muted text-[14px]">{t("noOffers")}</p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {offers.map((offer, index) => {
                const Icon = ACTION_ICONS[offer.action_type];
                return (
                  <li key={offer.id}>
                    <button
                      type="button"
                      disabled={adding !== null}
                      onClick={() => add("service", offer.id)}
                      style={{ "--rise-delay": `${index * 0.03}s` } as CSSProperties}
                      className="rise-in border-line-strong hover:border-ink/30 hover:bg-canvas flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors active:scale-[0.98] disabled:opacity-60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                        {adding === offer.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Icon className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-ink block truncate text-[14px] font-medium">
                          {offer.title}
                        </span>
                        {offer.onPage ? (
                          <span className="text-ink-subtle text-[12px]">{t("alreadyOnPage")}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

function Grid({
  types,
  adding,
  onPick,
  offset = 0,
}: {
  types: BlockType[];
  adding: string | null;
  onPick: (type: BlockType) => void;
  offset?: number;
}) {
  const t = useTranslations("page.blocks");
  const base = useId();
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {types.map((type, index) => (
        <li key={type}>
          <button
            type="button"
            disabled={adding !== null}
            onClick={() => onPick(type)}
            aria-labelledby={`${base}-${type}-title`}
            aria-describedby={`${base}-${type}-description`}
            style={{ "--rise-delay": `${Math.min(index + offset, 14) * 0.025}s` } as CSSProperties}
            className={cn(
              "rise-in group border-line-strong hover:border-ink/30 hover:bg-canvas flex h-full w-full flex-col items-start gap-2.5 rounded-[var(--radius-md)] border p-3.5 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.97] disabled:opacity-60",
            )}
          >
            {adding === type ? (
              <span className="flex size-12 items-center justify-center">
                <Loader2 className="text-ink-subtle size-5 animate-spin" aria-hidden />
              </span>
            ) : (
              <span className="transition-transform duration-300 motion-safe:group-hover:-rotate-3">
                <BlockGlyph type={type} />
              </span>
            )}
            <span>
              <span
                id={`${base}-${type}-title`}
                className="text-ink block text-[14px] leading-tight font-medium"
              >
                {t(`${type}.title`)}
              </span>
              <span
                id={`${base}-${type}-description`}
                className="text-ink-muted mt-1 block text-[12.5px] leading-snug"
              >
                {t(`${type}.description`)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
