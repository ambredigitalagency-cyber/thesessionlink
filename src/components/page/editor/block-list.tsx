"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, CircleAlert, GripVertical, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { Toggle } from "@/components/ui/primitives";
import type { BlockType } from "@/lib/page/blocks";
import { cn } from "@/lib/utils";

import { BlockGlyph } from "./block-meta";

/** A list only moves up and down: the drag ignores sideways drift. */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export type ListItem = {
  id: string;
  type: BlockType;
  visible: boolean;
  /** What the row says under the block's name: its title, its URL… */
  summary: string;
  complete: boolean;
};

/**
 * The page's blocks, in order. Drag by the handle (or focus it and use the
 * arrow keys) to reorder; the switch hides a block without deleting it; the
 * bin asks once, in place, before deleting. A row opens into its form.
 */
export function BlockList({
  items,
  openId,
  onOpen,
  onReorder,
  onToggleVisible,
  onDelete,
  renderForm,
}: {
  items: ListItem[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  onReorder: (ids: string[]) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  onDelete: (id: string) => void;
  renderForm: (id: string) => ReactNode;
}) {
  const t = useTranslations("page.editor");
  // A fixed id keeps dnd-kit's accessibility ids the same on the server and
  // in the browser (its own counter differs between the two).
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((item) => item.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: t("dragInstructions") },
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggleOpen={() => onOpen(openId === item.id ? null : item.id)}
              onToggleVisible={(visible) => onToggleVisible(item.id, visible)}
              onDelete={() => onDelete(item.id)}
            >
              {renderForm(item.id)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({
  item,
  open,
  onToggleOpen,
  onToggleVisible,
  onDelete,
  children,
}: {
  item: ListItem;
  open: boolean;
  onToggleOpen: () => void;
  onToggleVisible: (visible: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("page.editor");
  const tBlocks = useTranslations("page.blocks");
  const [confirming, setConfirming] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const name = tBlocks(`${item.type}.title`);

  return (
    <li
      ref={setNodeRef}
      id={`block-${item.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "bg-surface rounded-[var(--radius-md)] border transition-[border-color,box-shadow]",
        open ? "border-ink/25 shadow-[var(--shadow-card)]" : "border-line",
        isDragging && "relative z-10 shadow-[var(--shadow-float)]",
      )}
    >
      <div className="flex items-center gap-1.5 py-2 pr-2.5 pl-1.5">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("dragHandle", { name })}
          className="text-ink-subtle hover:text-ink flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={`block-form-${item.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] py-1 text-left"
        >
          <span className={cn("transition-opacity", !item.visible && "opacity-45")}>
            <BlockGlyph type={item.type} size="sm" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-ink flex items-center gap-2 text-[14px] font-medium">
              {name}
              {!item.complete ? (
                <span className="bg-warning-soft text-warning inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
                  <CircleAlert className="size-3" aria-hidden />
                  {t("incomplete")}
                </span>
              ) : !item.visible ? (
                <span className="bg-ink/5 text-ink-muted rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
                  {t("hidden")}
                </span>
              ) : null}
            </span>
            {item.summary ? (
              <span className="text-ink-muted block truncate text-[12.5px]">{item.summary}</span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "text-ink-subtle size-4 shrink-0 transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>

        <Toggle
          checked={item.visible}
          onCheckedChange={onToggleVisible}
          label={t("visibleFor", { name })}
        />

        {confirming ? (
          <span className="flex items-center gap-1 pl-1">
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
              className="text-ink-muted hover:text-ink rounded-full px-2 py-1 text-[12px]"
            >
              {t("cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t("delete", { name })}
            className="text-ink-subtle hover:text-danger flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`block-form-${item.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-line border-t px-4 pt-4 pb-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
