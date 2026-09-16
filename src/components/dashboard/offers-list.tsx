"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, EyeOff, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteOffer, duplicateOffer, reorderOffers, setOfferActive } from "@/actions/offers";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Modal,
} from "@/components/ui/overlays";
import { Badge } from "@/components/ui/primitives";
import { ACTION_ICONS } from "@/lib/offers/meta";
import { parseActionConfig, type ActionType } from "@/lib/offers/schema";
import { cn, formatPrice } from "@/lib/utils";

export type OfferListItem = {
  id: string;
  title: string;
  price: number | null;
  price_type: "fixed" | "from" | "free" | "on_request";
  main_photo_url: string | null;
  action_type: ActionType;
  action_config: unknown;
  is_active: boolean;
  position: number;
};

export function OffersList({
  offers: initialOffers,
  currency,
  locale,
}: {
  offers: OfferListItem[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.offers");
  const tError = useTranslations("errors");
  const [offers, setOffers] = useState(initialOffers);
  const [serverOffers, setServerOffers] = useState(initialOffers);
  const [, startTransition] = useTransition();

  // Re-sync when the server sends a new list (create, delete, refresh).
  if (serverOffers !== initialOffers) {
    setServerOffers(initialOffers);
    setOffers(initialOffers);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = offers.findIndex((offer) => offer.id === active.id);
    const newIndex = offers.findIndex((offer) => offer.id === over.id);
    const next = arrayMove(offers, oldIndex, newIndex);
    setOffers(next);

    startTransition(async () => {
      const result = await reorderOffers(next.map((offer) => offer.id));
      if (!result.ok) {
        setOffers(offers);
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={offers.map((offer) => offer.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2.5">
          {offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} currency={currency} locale={locale} />
          ))}
        </ul>
      </SortableContext>

      <p className="text-ink-subtle mt-4 text-center text-[12.5px]">{t("reorderHint")}</p>
    </DndContext>
  );
}

function OfferRow({
  offer,
  currency,
  locale,
}: {
  offer: OfferListItem;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.offers");
  const tActions = useTranslations("offers.actions");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: offer.id,
  });

  const Icon = ACTION_ICONS[offer.action_type];
  const price = formatPrice(offer.price, currency, locale, offer.price_type);
  const config = parseActionConfig(offer.action_type, offer.action_config);

  function toggleActive() {
    startTransition(async () => {
      const result = await setOfferActive(offer.id, !offer.is_active);
      if (!result.ok) toast.error(tError(result.error as "unexpected"));
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "surface-card flex items-center gap-3 p-3 transition-shadow",
        isDragging && "z-10 shadow-[var(--shadow-float)]",
        !offer.is_active && "opacity-60",
      )}
    >
      <button
        type="button"
        className="text-ink-subtle hover:bg-ink/5 hover:text-ink cursor-grab touch-none rounded-full p-1.5 transition-colors active:cursor-grabbing"
        aria-label={t("dragHandle", { title: offer.title })}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="bg-ink/5 relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-xs)]">
        {offer.main_photo_url ? (
          <Image src={offer.main_photo_url} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="text-ink-subtle flex size-full items-center justify-center">
            <Icon className="size-5" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/offers/${offer.id}`}
          className="text-ink block truncate text-[15px] font-medium hover:underline"
        >
          {offer.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            <Icon className="size-3" />
            {tActions(`${offer.action_type}.label`)}
          </Badge>
          <span className="text-ink-muted text-[13px]">
            {price.type === "free"
              ? tCommon("free")
              : price.type === "on_request"
                ? tCommon("onRequest")
                : price.type === "from"
                  ? tCommon("from", { price: price.amount ?? "" })
                  : price.amount}
          </span>
          {offer.action_type === "calendar_booking" && "duration_minutes" in config ? (
            <span className="text-ink-subtle text-[13px]">· {config.duration_minutes} min</span>
          ) : null}
          {!offer.is_active ? <Badge tone="outline">{t("hidden")}</Badge> : null}
        </div>
      </div>

      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("menuLabel")} loading={pending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => router.push(`/dashboard/offers/${offer.id}`)}>
            <Pencil className="size-3.5" />
            {tCommon("edit")}
          </MenuItem>
          <MenuItem onSelect={toggleActive}>
            {offer.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {offer.is_active ? t("hide") : t("show")}
          </MenuItem>
          <MenuItem
            onSelect={() =>
              startTransition(async () => {
                const result = await duplicateOffer(offer.id);
                if (result.ok) {
                  toast.success(t("duplicated"));
                } else {
                  toast.error(tError(result.error as "unexpected"));
                }
              })
            }
          >
            <Copy className="size-3.5" />
            {tCommon("duplicate")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem tone="danger" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" />
            {tCommon("delete")}
          </MenuItem>
        </MenuContent>
      </Menu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        size="sm"
        title={t("deleteTitle")}
        description={t("deleteBody", { title: offer.title })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteOffer(offer.id);
                  if (result.ok) {
                    toast.success(t("deleted"));
                    setConfirmOpen(false);
                  } else {
                    toast.error(tError(result.error as "unexpected"));
                  }
                })
              }
            >
              {tCommon("delete")}
            </Button>
          </>
        }
      />
    </li>
  );
}
