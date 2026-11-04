"use client";

import {
  Check,
  CloudOff,
  ExternalLink,
  Loader2,
  Palette,
  Plus,
  LayoutList,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addBlock,
  confirmBlock,
  deleteBlock,
  reorderBlocks,
  setBlockVisible,
  updateAppearance,
  updateBlock,
  updatePageProfile,
  type EditorBlock,
} from "@/actions/page";
import { PageView } from "@/components/page/page-view";
import { PhoneFrame } from "@/components/page/phone-frame";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { MAX_BLOCKS, validateBlock, type BlockType, type PageBlock } from "@/lib/page/blocks";
import { detectPlatform, linkLabel } from "@/lib/page/urls";
import type { ThemeId } from "@/lib/page/themes";
import { cn } from "@/lib/utils";

import { AddBlockDialog, type OfferChoice } from "./add-block";
import { AppearancePanel } from "./appearance-panel";
import { BlockForm } from "./block-forms";
import { BlockList, type ListItem } from "./block-list";
import { PLATFORM_NAMES } from "@/components/page/platform-icon";
import { BlockGlyph } from "./block-meta";
import { ProfilePanel, type CategoryOption, type HeaderDraft } from "./profile-panel";
import { TodoList } from "./todo-list";

type Status = "idle" | "saving" | "saved" | "error";
type Panel = "blocks" | "profile" | "appearance";

/**
 * Saves as the coach works: each change waits a short moment for the next
 * keystroke, then goes. "Saving…" while anything is on its way, "Saved" once
 * everything landed, "Not saved" with a retry when something did not — and
 * what was typed stays on screen either way.
 */
function useSaveQueue() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const failed = useRef(new Map<string, () => Promise<boolean>>());
  const inflight = useRef(0);
  const [status, setStatus] = useState<Status>("idle");

  const settle = useCallback(() => {
    if (inflight.current === 0 && timers.current.size === 0) {
      setStatus(failed.current.size > 0 ? "error" : "saved");
    }
  }, []);

  const run = useCallback(
    async (key: string, task: () => Promise<boolean>) => {
      timers.current.delete(key);
      inflight.current += 1;
      let ok = false;
      try {
        ok = await task();
      } catch {
        ok = false;
      }
      inflight.current -= 1;
      if (ok) failed.current.delete(key);
      else failed.current.set(key, task);
      settle();
    },
    [settle],
  );

  const schedule = useCallback(
    (key: string, task: () => Promise<boolean>, delay = 700) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      setStatus("saving");
      timers.current.set(
        key,
        setTimeout(() => void run(key, task), delay),
      );
    },
    [run],
  );

  const retry = useCallback(() => {
    const tasks = [...failed.current.entries()];
    failed.current.clear();
    setStatus("saving");
    for (const [key, task] of tasks) void run(key, task);
  }, [run]);

  // Leaving with changes on their way, or refused, loses them: say so.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (timers.current.size > 0 || inflight.current > 0 || failed.current.size > 0) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return { status, schedule, retry };
}

export function PageEditor({
  initialBlocks,
  offers,
  profile,
  initialHeader,
  initialTheme,
  initialAccent,
  categories,
  categorySlugById,
  linkBase,
  publicUrl,
  locale,
}: {
  initialBlocks: EditorBlock[];
  offers: (PublicOffer & { is_active: boolean })[];
  profile: PublicProfile;
  initialHeader: HeaderDraft;
  initialTheme: ThemeId;
  initialAccent: string;
  categories: CategoryOption[];
  categorySlugById: Record<string, string>;
  linkBase: string;
  publicUrl: string;
  locale: string;
}) {
  const t = useTranslations("page.editor");
  const tBlocks = useTranslations("page.blocks");
  const tPublic = useTranslations("publicProfile");
  const tError = useTranslations("errors");
  const tSummary = useTranslations("page.summary");
  const { status, schedule, retry } = useSaveQueue();

  const [blocks, setBlocks] = useState(initialBlocks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, Set<string>>>({});
  const [header, setHeader] = useState(initialHeader);
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [appearance, setAppearance] = useState({ theme: initialTheme, accent: initialAccent });
  const [slug, setSlug] = useState(profile.slug);
  const [panel, setPanel] = useState<Panel>("blocks");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [adding, setAdding] = useState(false);

  const offerById = useMemo(() => new Map(offers.map((offer) => [offer.id, offer])), [offers]);

  /* ---- Blocks ------------------------------------------------------------- */

  const validation = useMemo(
    () => new Map(blocks.map((block) => [block.id, validateBlock(block.type, block.config)])),
    [blocks],
  );

  function changeConfig(id: string, config: Record<string, unknown>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, config } : block)),
    );
    schedule(`block:${id}`, async () => (await updateBlock(id, config)).ok);
  }

  function touch(id: string, path: string) {
    setTouched((current) => {
      const next = new Set(current[id]);
      next.add(path);
      return { ...current, [id]: next };
    });
  }

  function openBlock(id: string | null) {
    // Leaving a block shows what is still missing in it the next time.
    if (openId && openId !== id) {
      const result = validation.get(openId);
      if (result && !result.ok) {
        setTouched((current) => ({ ...current, [openId]: new Set(Object.keys(result.errors)) }));
      }
    }
    setOpenId(id);
  }

  async function add(type: BlockType, offerId?: string) {
    const result = await addBlock({ type, offerId });
    if (!result.ok || !result.data) {
      notify.error(tError(result.ok ? "unexpected" : (result.error as "unexpected")));
      return;
    }
    const created = result.data;
    setBlocks((current) => [...current, created]);
    setAdding(false);
    setPanel("blocks");
    setTab("edit");
    setOpenId(type === "divider" || type === "service" ? null : created.id);
    requestAnimationFrame(() =>
      document
        .getElementById(`block-${created.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function reorder(ids: string[]) {
    setBlocks((current) =>
      ids.map((id) => current.find((block) => block.id === id)!).filter(Boolean),
    );
    schedule("order", async () => (await reorderBlocks(ids)).ok, 0);
  }

  function toggleVisible(id: string, visible: boolean) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, visible } : block)),
    );
    schedule(`visible:${id}`, async () => (await setBlockVisible(id, visible)).ok, 0);
  }

  /** A block to complete goes public: only once it validates, and only here. */
  async function confirm(id: string) {
    const result = await confirmBlock(id);
    if (!result.ok) {
      notify.error(tError(result.error as "unexpected"));
      return;
    }
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, pending: false } : block)),
    );
    notify.success(t("confirmed"));
  }

  function openFromTodo(id: string) {
    setPanel("blocks");
    openBlock(id);
    requestAnimationFrame(() =>
      document
        .getElementById(`block-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function remove(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
    if (openId === id) setOpenId(null);
    schedule(`delete:${id}`, async () => (await deleteBlock(id)).ok, 0);
  }

  /* ---- Header and appearance --------------------------------------------- */

  function changeHeader(next: HeaderDraft) {
    setHeader(next);
    schedule("header", async () => {
      const result = await updatePageProfile({
        ...next,
        display_name: next.display_name.trim(),
      });
      setHeaderErrors(result.ok ? {} : (result.fieldErrors ?? {}));
      return result.ok;
    });
  }

  function changeAppearance(next: { theme: ThemeId; accent: string }) {
    setAppearance(next);
    schedule("appearance", async () => (await updateAppearance(next)).ok, 400);
  }

  /* ---- What the preview shows -------------------------------------------- */

  // Blocks to complete show in the coach's preview as marked placeholders —
  // never with their unfinished content, and never on the public page.
  const previewBlocks: PageBlock[] = blocks.flatMap((block) => {
    if (block.visible && block.pending) {
      return [
        { id: block.id, type: block.type, config: {}, visible: true, offerId: null, pending: true },
      ] as PageBlock[];
    }
    const result = validation.get(block.id);
    if (!block.visible || !result?.ok) return [];
    return [
      {
        id: block.id,
        type: block.type,
        config: result.config,
        visible: true,
        offerId: block.offer_id,
      } as PageBlock,
    ];
  });

  const previewProfile: PublicProfile = {
    ...profile,
    slug,
    display_name: header.display_name || profile.display_name,
    headline: header.headline.trim() || null,
    bio: header.bio.trim() || null,
    location: header.location.trim() || null,
    avatar_url: header.avatar_url,
    details: header.custom_fields,
  };

  const activeOffers = offers.filter((offer) => offer.is_active);

  const summary = (block: EditorBlock): string => {
    const c = block.config as Record<string, unknown>;
    const s = (value: unknown) => (typeof value === "string" ? value : "");
    const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);
    switch (block.type) {
      case "link":
        return s(c.title) || linkLabel(s(c.url));
      case "socials":
        return (Array.isArray(c.links) ? (c.links as string[]) : [])
          .filter(Boolean)
          .map((url) => PLATFORM_NAMES[detectPlatform(url)])
          .join(" · ");
      case "whatsapp":
      case "call":
        return s(c.number);
      case "email":
        return s(c.email);
      case "service":
        return block.offer_id ? (offerById.get(block.offer_id)?.title ?? "") : "";
      case "youtube":
        return s(c.title) || s(c.url);
      case "text":
        return s(c.title) || s(c.body);
      case "faq":
        return tSummary("questions", { count: count(c.items) });
      case "reviews":
        return tSummary("reviews", { count: count(c.items) });
      case "hours":
        return tSummary("openDays", {
          count: (Array.isArray(c.days) ? (c.days as { closed: boolean }[]) : []).filter(
            (day) => !day.closed,
          ).length,
        });
      case "gallery":
        return tSummary("photos", { count: count(c.images) });
      case "pricing":
        return tSummary("prices", { count: count(c.items) });
      case "address":
        return s(c.address);
      case "file":
        return s(c.name);
      case "announcement":
        return s(c.title);
      case "stats":
        return (Array.isArray(c.items) ? (c.items as { value: string }[]) : [])
          .map((item) => item.value)
          .filter(Boolean)
          .join(" · ");
      case "vcard":
        return s(c.label);
      case "divider":
        return "";
    }
  };

  const items: ListItem[] = blocks.map((block) => {
    const result = validation.get(block.id);
    const missingOffer =
      block.type === "service" && (!block.offer_id || !offerById.get(block.offer_id)?.is_active);
    return {
      id: block.id,
      type: block.type,
      visible: block.visible,
      summary: summary(block),
      complete: Boolean(result?.ok) && !missingOffer && !block.pending,
    };
  });

  const offerChoices: OfferChoice[] = activeOffers.map((offer) => ({
    id: offer.id,
    title: offer.title,
    action_type: offer.action_type,
    onPage: blocks.some((block) => block.offer_id === offer.id),
  }));

  /* ---- Layout ------------------------------------------------------------- */

  const panels: { id: Panel; icon: typeof LayoutList; label: string }[] = [
    { id: "blocks", icon: LayoutList, label: t("panels.blocks") },
    { id: "profile", icon: UserRound, label: t("panels.profile") },
    { id: "appearance", icon: Palette, label: t("panels.appearance") },
  ];

  const editor = (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label={t("panelsLabel")}
        className="bg-ink/[0.04] flex gap-1 rounded-full p-1"
      >
        {panels.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => setPanel(id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
              panel === id ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {panel === id ? (
              <motion.span
                layoutId="editor-panel"
                className="bg-surface absolute inset-0 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.08)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="relative size-3.5" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panel}
          role="tabpanel"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {panel === "blocks" ? (
            <div className="space-y-4">
              <TodoList blocks={blocks} profileId={profile.id} onOpen={openFromTodo} />
              {blocks.length === 0 ? (
                <p className="border-line text-ink-muted rounded-[var(--radius-md)] border border-dashed p-6 text-center text-[14px]">
                  {t("empty")}
                </p>
              ) : (
                <BlockList
                  items={items}
                  openId={openId}
                  onOpen={openBlock}
                  onReorder={reorder}
                  onToggleVisible={toggleVisible}
                  onDelete={remove}
                  renderForm={(id) => {
                    const block = blocks.find((item) => item.id === id);
                    if (!block) return null;
                    const result = validation.get(id);
                    const errors = result && !result.ok ? result.errors : {};
                    const offer = block.offer_id ? offerById.get(block.offer_id) : undefined;
                    return (
                      <>
                        {block.pending ? (
                          <PendingBanner
                            ready={Boolean(result?.ok)}
                            onConfirm={() => confirm(id)}
                          />
                        ) : null}
                        <BlockForm
                          type={block.type}
                          config={block.config}
                          onChange={(config) => changeConfig(id, config)}
                          errorFor={(path) =>
                            touched[id]?.has(path) ? (errors[path] ?? null) : null
                          }
                          touch={(path) => touch(id, path)}
                          offerTitle={offer?.is_active ? offer.title : null}
                          offerId={block.offer_id}
                          locale={locale}
                        />
                      </>
                    );
                  }}
                />
              )}
              <Button
                type="button"
                block
                size="lg"
                onClick={() => setAdding(true)}
                disabled={blocks.length >= MAX_BLOCKS}
              >
                <Plus className="size-4" aria-hidden />
                {t("add")}
              </Button>
              <p className="text-ink-subtle text-center text-[12px]">
                {t("count", { count: blocks.length, max: MAX_BLOCKS })}
              </p>
            </div>
          ) : panel === "profile" ? (
            <ProfilePanel
              draft={header}
              onChange={changeHeader}
              errors={headerErrors}
              categories={categories}
              locale={locale}
              slug={slug}
              linkBase={linkBase}
              onSlugChanged={setSlug}
            />
          ) : (
            <AppearancePanel
              theme={appearance.theme}
              accent={appearance.accent}
              onChange={changeAppearance}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const preview = (
    <div>
      <PhoneFrame>
        <PageView
          preview
          profile={previewProfile}
          blocks={previewBlocks}
          offers={activeOffers}
          theme={appearance.theme}
          accent={appearance.accent}
          renderPending={(block) => (
            <div className="flex items-center gap-3 rounded-[min(var(--page-radius),16px)] border border-dashed border-[var(--page-border)] p-3 text-left">
              <BlockGlyph type={block.type} size="sm" />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">
                  {tBlocks(`${block.type}.title`)}
                </span>
                <span className="block text-[12px] text-[var(--page-muted)]">
                  {tPublic("pendingPreview")}
                </span>
              </span>
            </div>
          )}
        />
      </PhoneFrame>
      <p className="text-ink-subtle mt-3 text-center text-[12px]">{t("previewNote")}</p>
    </div>
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
          <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} onRetry={retry} />
          <a
            href={publicUrl.replace(profile.slug, slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line-strong text-ink hover:border-ink/30 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors"
          >
            {t("viewPage")}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </header>

      {/* Below the wide layout: one column, Edit and Preview as tabs. */}
      <div
        role="tablist"
        aria-label={t("viewLabel")}
        className="bg-ink/[0.04] mb-5 flex gap-1 rounded-full p-1 lg:hidden"
      >
        {(["edit", "preview"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors",
              tab === id
                ? "bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.08)]"
                : "text-ink-muted",
            )}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className={cn(tab === "preview" && "hidden lg:block")}>{editor}</div>
        <div
          className={cn("lg:sticky lg:top-6 lg:self-start", tab === "edit" && "hidden lg:block")}
        >
          {preview}
        </div>
      </div>

      <AddBlockDialog
        open={adding}
        onOpenChange={setAdding}
        categorySlug={header.category_id ? (categorySlugById[header.category_id] ?? null) : null}
        offers={offerChoices}
        full={blocks.length >= MAX_BLOCKS}
        onAdd={add}
      />
    </div>
  );
}

function SaveStatus({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const t = useTranslations("page.editor.status");
  return (
    <span
      aria-live="polite"
      className="text-ink-muted inline-flex min-h-8 items-center text-[12.5px]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" ? null : (
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-1.5"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("saving")}
              </>
            ) : status === "saved" ? (
              <>
                <Check className="text-success size-3.5" aria-hidden />
                {t("saved")}
              </>
            ) : (
              <>
                <CloudOff className="text-danger size-3.5" aria-hidden />
                <span className="text-danger">{t("error")}</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-ink ml-1 font-medium underline underline-offset-4"
                >
                  {t("retry")}
                </button>
              </>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Above the form of a block still to complete: invisible to visitors until validated here. */
function PendingBanner({ ready, onConfirm }: { ready: boolean; onConfirm: () => Promise<void> }) {
  const t = useTranslations("page.editor");
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-warning-soft mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] p-3">
      <p className="text-ink min-w-0 flex-1 text-[13px] leading-relaxed">
        {ready ? t("pendingNote") : t("confirmHint")}
      </p>
      <Button
        type="button"
        size="sm"
        disabled={!ready}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
        }}
      >
        <Check className="size-3.5" aria-hidden />
        {t("confirm")}
      </Button>
    </div>
  );
}
