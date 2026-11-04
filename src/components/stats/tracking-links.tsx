"use client";

import { Check, Copy, Info, Loader2, QrCode, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type CSSProperties } from "react";

import { createSource, deleteSource, type TrackingSource } from "@/actions/tracking";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlays";
import { notify } from "@/lib/notify";
import type { ThemeId } from "@/lib/page/themes";
import { trackingUrl } from "@/lib/tracking/qr";
import { SOURCE_PRESETS, type SourceKind } from "@/lib/tracking/sources";

import { QrCodePanel } from "./qr-code";
import { SOURCE_BRANDS, SourceIcon } from "./source-icon";

type Counts = Record<string, { views: number; contacts: number }>;

/** The tile a source is drawn on: its icon on the brand's soft wash, like the block library. */
function SourceGlyph({ kind, slug }: { kind: SourceKind; slug: string }) {
  return (
    <span aria-hidden className="relative inline-flex size-11 shrink-0">
      <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-[12px] bg-[color-mix(in_oklab,var(--color-brand)_14%,transparent)]" />
      <span className="relative flex size-full items-center justify-center rounded-[12px] border border-[color-mix(in_oklab,var(--color-brand)_28%,transparent)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <SourceIcon source={slug} kind={kind} className="size-5" />
      </span>
    </span>
  );
}

export function TrackingLinks({
  initialSources,
  counts,
  slug,
  siteUrl,
  displayName,
  accent,
  theme,
}: {
  initialSources: TrackingSource[];
  counts: Counts;
  slug: string;
  siteUrl: string;
  displayName: string;
  accent: string;
  theme: ThemeId;
}) {
  const t = useTranslations("stats.links");
  const tError = useTranslations("errors");
  const [sources, setSources] = useState(initialSources);
  const [adding, setAdding] = useState<SourceKind | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherLabel, setOtherLabel] = useState("");
  const [qrFor, setQrFor] = useState<TrackingSource | null>(null);
  const [, startTransition] = useTransition();

  const presetLabel = (kind: SourceKind) =>
    SOURCE_BRANDS[kind] ?? t(`kinds.${kind as "flyer" | "carte" | "vitrine" | "autre"}`);

  function create(kind: SourceKind, label: string) {
    setAdding(kind);
    startTransition(async () => {
      const result = await createSource({ kind, label });
      setAdding(null);
      if (result.ok && result.data) {
        setSources((current) => [...current, result.data!]);
        setOtherOpen(false);
        setOtherLabel("");
        notify.success(t("created", { label: result.data.label }));
      } else if (!result.ok) {
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  function remove(source: TrackingSource) {
    setSources((current) => current.filter((item) => item.id !== source.id));
    startTransition(async () => {
      const result = await deleteSource(source.id);
      if (!result.ok) {
        setSources((current) => [...current, source]);
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-ink text-[15px] font-semibold">{t("addTitle")}</h2>
        <p className="text-ink-muted mt-0.5 text-[13px]">{t("addHint")}</p>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {SOURCE_PRESETS.map((preset, index) => (
            <li key={preset.kind}>
              <button
                type="button"
                disabled={adding !== null}
                onClick={() =>
                  preset.kind === "autre"
                    ? setOtherOpen(true)
                    : create(preset.kind, presetLabel(preset.kind))
                }
                style={{ "--rise-delay": `${index * 0.03}s` } as CSSProperties}
                className="rise-in group border-line-strong hover:border-ink/30 hover:bg-canvas flex h-full w-full flex-col items-start gap-2.5 rounded-[var(--radius-md)] border p-3.5 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.97] disabled:opacity-60"
              >
                {adding === preset.kind ? (
                  <span className="flex size-11 items-center justify-center">
                    <Loader2 className="text-ink-subtle size-5 animate-spin" aria-hidden />
                  </span>
                ) : (
                  <span className="transition-transform duration-300 motion-safe:group-hover:-rotate-3">
                    <SourceGlyph kind={preset.kind} slug={preset.slug} />
                  </span>
                )}
                <span>
                  <span className="text-ink block text-[14px] font-medium">
                    {presetLabel(preset.kind)}
                  </span>
                  <span className="text-ink-muted mt-0.5 block text-[12px] leading-snug">
                    {preset.printed ? t("printed") : t(`hints.${preset.kind}`)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <AnimatePresence initial={false}>
          {otherOpen ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
              onSubmit={(event) => {
                event.preventDefault();
                if (otherLabel.trim()) create("autre", otherLabel.trim());
              }}
            >
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label={t("otherLabel")} className="min-w-0 flex-1">
                  <Input
                    autoFocus
                    value={otherLabel}
                    maxLength={40}
                    placeholder={t("otherPlaceholder")}
                    onChange={(event) => setOtherLabel(event.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={!otherLabel.trim()} loading={adding === "autre"}>
                  {t("create")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOtherOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </section>

      <section>
        <h2 className="text-ink text-[15px] font-semibold">{t("listTitle")}</h2>
        {sources.length === 0 ? (
          <p className="border-line text-ink-muted mt-3 rounded-[var(--radius-md)] border border-dashed p-6 text-center text-[14px]">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            <AnimatePresence initial={false}>
              {sources.map((source) => (
                <motion.li
                  key={source.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SourceCard
                    source={source}
                    url={trackingUrl(siteUrl, slug, source.slug)}
                    counts={counts[source.slug] ?? { views: 0, contacts: 0 }}
                    onQr={() => setQrFor(source)}
                    onDelete={() => remove(source)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <QrDialog
        source={qrFor}
        url={qrFor ? trackingUrl(siteUrl, slug, qrFor.slug) : ""}
        slug={slug}
        displayName={displayName}
        accent={accent}
        theme={theme}
        onClose={() => setQrFor(null)}
      />
    </div>
  );
}

function SourceCard({
  source,
  url,
  counts,
  onQr,
  onDelete,
}: {
  source: TrackingSource;
  url: string;
  counts: { views: number; contacts: number };
  onQr: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("stats.links");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify.error(t("copyFailed"));
    }
  }

  return (
    <div className="border-line bg-surface rounded-[var(--radius-md)] border p-4">
      <div className="flex flex-wrap items-start gap-3">
        <SourceGlyph kind={source.kind} slug={source.slug} />
        <div className="min-w-0 flex-1">
          <p className="text-ink text-[15px] font-medium">{source.label}</p>
          <p className="text-ink-muted mt-0.5 truncate font-mono text-[12.5px]">
            {url.replace(/^https?:\/\//, "")}
          </p>
          <p className="text-ink-muted mt-1.5 text-[12.5px]">
            {t("counts", { views: counts.views, contacts: counts.contacts })}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            type="button"
            size="sm"
            variant={copied ? "primary" : "secondary"}
            onClick={copy}
            aria-live="polite"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "done" : "copy"}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                {copied ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </motion.span>
            </AnimatePresence>
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onQr}>
            <QrCode className="size-3.5" aria-hidden />
            {t("qr")}
          </Button>
          {confirming ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDelete}
                className="bg-danger rounded-full px-2.5 py-1 text-[12px] font-semibold text-white"
              >
                {t("confirmDelete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-ink-muted rounded-full px-2 py-1 text-[12px]"
              >
                {t("cancel")}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={t("delete", { label: source.label })}
              className="text-ink-subtle hover:text-danger flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      {source.kind === "instagram" ? (
        <p className="bg-canvas text-ink-muted mt-3 flex gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-[12.5px] leading-relaxed">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("instagramHelp")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The QR of one source, in the coach's colours when they scan (see qrColors),
 * as a high-resolution PNG, an SVG, or a sheet ready to print.
 */
function QrDialog({
  source,
  url,
  slug,
  displayName,
  accent,
  theme,
  onClose,
}: {
  source: TrackingSource | null;
  url: string;
  slug: string;
  displayName: string;
  accent: string;
  theme: ThemeId;
  onClose: () => void;
}) {
  const t = useTranslations("stats.links");

  return (
    <Modal
      open={Boolean(source)}
      onOpenChange={(open) => !open && onClose()}
      title={source ? t("qrTitle", { label: source.label }) : ""}
      description={t("qrHint")}
    >
      {source ? (
        <QrCodePanel
          url={url}
          filename={`qr-${slug}-${source.slug}`}
          displayName={displayName}
          accent={accent}
          theme={theme}
        />
      ) : null}
    </Modal>
  );
}
