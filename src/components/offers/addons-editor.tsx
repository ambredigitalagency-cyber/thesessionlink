"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ADDON_LIMITS, newAddonId, type Addon } from "@/lib/offers/addons";

/**
 * The extras of an offer, one line each: what it is, what it costs.
 *
 * A line arrives and leaves with a short height-and-fade, so the list grows
 * under the hand instead of jumping; with reduced motion MotionConfig drops
 * the movement and the line is simply there.
 */
export function AddonsEditor({
  addons,
  onChange,
  currency,
  errors,
}: {
  addons: Addon[];
  onChange: (addons: Addon[]) => void;
  currency: string;
  errors: Record<string, string>;
}) {
  const t = useTranslations("offers.addons");
  const tError = useTranslations("errors");
  const full = addons.length >= ADDON_LIMITS.count;

  function update(index: number, patch: Partial<Addon>) {
    onChange(
      addons.map((addon, position) => (position === index ? { ...addon, ...patch } : addon)),
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-ink flex items-center gap-1.5 text-[15px] font-semibold">
          <Sparkles className="size-4 text-[var(--accent)]" aria-hidden />
          {t("title")}
        </h3>
        <p className="text-ink-muted mt-0.5 text-[13px]">{t("hint")}</p>
      </div>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {addons.map((addon, index) => {
            const labelError = errors[`addons.${index}.label`];
            const priceError = errors[`addons.${index}.price`];
            return (
              <motion.li
                key={addon.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="border-line bg-surface flex items-start gap-2 rounded-[var(--radius-md)] border p-2.5">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={addon.label}
                      onChange={(event) => update(index, { label: event.target.value })}
                      placeholder={t("labelPlaceholder")}
                      maxLength={ADDON_LIMITS.label}
                      aria-label={t("label", { number: index + 1 })}
                      aria-invalid={Boolean(labelError)}
                      autoFocus={addon.label === "" && index === addons.length - 1}
                    />
                    {labelError ? (
                      <p className="text-danger mt-1 text-[12.5px]">
                        {tError(labelError as "unexpected")}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative w-28 shrink-0">
                    <span className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px]">
                      +
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={Number.isFinite(addon.price) ? addon.price : ""}
                      onChange={(event) =>
                        update(index, {
                          price: event.target.value === "" ? 0 : Number(event.target.value),
                        })
                      }
                      aria-label={t("price", { number: index + 1 })}
                      aria-invalid={Boolean(priceError)}
                      className="pr-12 pl-6 tabular-nums"
                    />
                    <span className="text-ink-subtle pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px]">
                      {currency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(addons.filter((_, position) => position !== index))}
                    className="text-ink-subtle hover:bg-danger-soft hover:text-danger mt-1.5 rounded-full p-1.5 transition-colors"
                    aria-label={t("remove", { label: addon.label || t("untitled") })}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={full}
        onClick={() =>
          onChange([...addons, { id: newAddonId(), label: "", price: 0, description: null }])
        }
      >
        <Plus className="size-3.5" />
        {addons.length === 0 ? t("addFirst") : t("add")}
      </Button>
      {full ? (
        <p className="text-ink-subtle text-[12.5px]">{t("limit", { max: ADDON_LIMITS.count })}</p>
      ) : null}
    </section>
  );
}
