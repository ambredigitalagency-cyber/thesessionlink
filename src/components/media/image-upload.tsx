"use client";

import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { notify } from "@/lib/notify";
import { UploadError, deleteImage, uploadImage, type UploadFolder } from "@/lib/media/upload";
import { cn } from "@/lib/utils";

function useUploader(folder: UploadFolder) {
  const t = useTranslations("media");
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null): Promise<string[]> {
    if (!files || files.length === 0) return [];
    setBusy(true);

    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadImage(file, folder));
      }
      return urls;
    } catch (error) {
      const code = error instanceof UploadError ? error.code : "failed";
      notify.error(t(`errors.${code}` as "errors.failed"));
      return [];
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy };
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

export function AvatarUpload({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  name: string;
}) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUploader("avatar");

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group border-line-strong bg-canvas relative size-20 shrink-0 overflow-hidden rounded-full border"
        aria-label={t("changePhoto")}
      >
        {value ? (
          <Image src={value} alt={name} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="text-ink-subtle flex size-full items-center justify-center">
            <ImagePlus className="size-5" />
          </span>
        )}
        <span className="bg-ink/45 absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="size-4 animate-spin" /> : t("change")}
        </span>
      </button>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-ink hover:text-ink-muted text-[13px] font-medium underline underline-offset-4"
          >
            {value ? t("changePhoto") : t("addPhoto")}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => {
                void deleteImage(value);
                onChange(null);
              }}
              className="text-ink-subtle hover:text-danger text-[13px] underline underline-offset-4"
            >
              {t("remove")}
            </button>
          ) : null}
        </div>
        <p className="text-ink-subtle text-[12px]">{t("hint")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const [url] = await upload(event.target.files);
          event.target.value = "";
          if (url) {
            if (value) void deleteImage(value);
            onChange(url);
          }
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cover image (offer main photo)                                              */
/* -------------------------------------------------------------------------- */

export function CoverUpload({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUploader("offers");
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    const [url] = await upload(files);
    if (url) {
      if (value) void deleteImage(value);
      onChange(url);
    }
  }

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (event) => {
          event.preventDefault();
          setDragging(false);
          await handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "border-line-strong bg-canvas relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-dashed transition-colors",
          dragging && "border-ink bg-ink/5",
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => {
                void deleteImage(value);
                onChange(null);
              }}
              className="bg-ink/70 hover:bg-ink absolute top-2.5 right-2.5 rounded-full p-1.5 text-white backdrop-blur transition-colors"
              aria-label={t("remove")}
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 px-6 py-8 text-center"
          >
            {busy ? (
              <Loader2 className="text-ink-muted size-5 animate-spin" />
            ) : (
              <span className="bg-ink/5 text-ink-muted flex size-10 items-center justify-center rounded-full">
                <ImagePlus className="size-4" />
              </span>
            )}
            <span className="text-ink text-[14px] font-medium">{t("addCover")}</span>
            <span className="text-ink-subtle text-[12px]">{t("dropHint")}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          await handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Gallery (custom field of type "images")                                     */
/* -------------------------------------------------------------------------- */

export function GalleryUpload({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUploader("offers");

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((url) => (
        <div
          key={url}
          className="border-line relative size-20 overflow-hidden rounded-[var(--radius-xs)] border"
        >
          <Image src={url} alt="" fill sizes="80px" className="object-cover" />
          <button
            type="button"
            onClick={() => {
              void deleteImage(url);
              onChange(value.filter((item) => item !== url));
            }}
            className="bg-ink/70 absolute top-1 right-1 rounded-full p-1 text-white"
            aria-label={t("remove")}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}

      {value.length < max ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-line-strong text-ink-subtle hover:border-ink hover:text-ink flex size-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-xs)] border border-dashed transition-colors"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="text-[11px]">{t("addImage")}</span>
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const urls = await upload(event.target.files);
          event.target.value = "";
          if (urls.length > 0) onChange([...value, ...urls].slice(0, max));
        }}
      />
    </div>
  );
}
