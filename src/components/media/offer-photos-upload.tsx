"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Lock, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { notify } from "@/lib/notify";
import { UploadError, deleteImage, uploadImage } from "@/lib/media/upload";
import { ABSOLUTE_MAX_PHOTOS } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Ordered photo picker for an offer: drag-and-drop or click to add, drag a tile
 * (or use the arrows) to reorder, first tile is the main photo.
 *
 * Photos are unlimited on the plan; the only cap is ABSOLUTE_MAX_PHOTOS, the
 * anti-abuse ceiling the server also enforces. It is checked here so the pro
 * hears about it before they hit save.
 */
export function OfferPhotosUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const t = useTranslations("media");

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const full = value.length >= ABSOLUTE_MAX_PHOTOS;
  const remaining = ABSOLUTE_MAX_PHOTOS - value.length;
  const limitHint = t("photoLimit", { max: ABSOLUTE_MAX_PHOTOS });

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const accepted = Array.from(files).slice(0, remaining);
    if (accepted.length < files.length) notify.error(limitHint);
    if (accepted.length === 0) return;

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of accepted) {
        urls.push(await uploadImage(file, "offers"));
      }
      onChange([...value, ...urls]);
    } catch (error) {
      const code = error instanceof UploadError ? error.code : "failed";
      notify.error(t(`errors.${code}` as "errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function remove(index: number) {
    void deleteImage(value[index]);
    onChange(value.filter((_, position) => position !== index));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={url}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
              }}
              className={cn(
                "border-line bg-canvas group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border transition-opacity",
                dragIndex === index && "opacity-40",
              )}
            >
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />

              {index === 0 ? (
                <span className="bg-scrim absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  {t("mainPhoto")}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => remove(index)}
                className="bg-scrim hover:bg-scrim/90 absolute top-1.5 right-1.5 rounded-full p-1 text-white backdrop-blur transition-colors"
                aria-label={t("remove")}
              >
                <X className="size-3" />
              </button>

              {/* Keyboard- and touch-friendly alternative to dragging a tile. */}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="rounded-full p-1 text-white disabled:opacity-30"
                  aria-label={t("moveEarlier")}
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="rounded-full p-1 text-white disabled:opacity-30"
                  aria-label={t("moveLater")}
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        onDragOver={(event) => {
          if (full) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (event) => {
          event.preventDefault();
          setDragging(false);
          if (full) {
            notify.error(limitHint);
            return;
          }
          await addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "border-line-strong bg-canvas flex w-full items-center justify-center rounded-[var(--radius-md)] border border-dashed transition-colors",
          dragging && "border-ink bg-ink/5",
          full && "opacity-60",
        )}
      >
        <button
          type="button"
          onClick={() => (full ? notify.error(limitHint) : inputRef.current?.click())}
          className="flex w-full flex-col items-center gap-2 px-6 py-7 text-center"
        >
          {busy ? (
            <Loader2 className="text-ink-muted size-5 animate-spin" />
          ) : (
            <span className="bg-ink/5 text-ink-muted flex size-10 items-center justify-center rounded-full">
              {full ? <Lock className="size-4" /> : <ImagePlus className="size-4" />}
            </span>
          )}
          <span className="text-ink text-[14px] font-medium">
            {value.length === 0 ? t("addCover") : t("addAnotherPhoto")}
          </span>
          <span className="text-ink-subtle text-[12px]">{full ? limitHint : t("dropHint")}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          await addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
