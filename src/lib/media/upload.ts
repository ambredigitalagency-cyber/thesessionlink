"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const BUCKET = "media";
const MAX_EDGE = 1600;
const AVATAR_EDGE = 640;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export type UploadFolder = "avatar" | "offers" | "page";

/** PDFs only, and small: a catalogue or a price list, not a library. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {
  constructor(public code: "too_large" | "unsupported" | "failed" | "unauthenticated") {
    super(code);
  }
}

/** Downscales and re-encodes to WebP in the browser, so uploads stay small. */
async function compress(file: File, maxEdge: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new UploadError("unsupported");
  if (file.size > MAX_INPUT_BYTES) throw new UploadError("too_large");
  if (file.type === "image/svg+xml") throw new UploadError("unsupported");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new UploadError("failed");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );

  if (!blob) throw new UploadError("failed");
  return blob;
}

/**
 * Uploads one image to `media/{user_id}/{folder}/…`.
 * Storage policies only allow writing inside the user's own folder.
 */
export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UploadError("unauthenticated");

  const blob = await compress(file, folder === "avatar" ? AVATAR_EDGE : MAX_EDGE);
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });

  if (error) {
    console.error("[upload] failed", error);
    throw new UploadError("failed");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Uploads one PDF to `media/{user_id}/files/…`.
 *
 * The type is checked twice — the declared MIME type and the file's first
 * bytes (`%PDF-`) — because a browser trusts the extension. The stored name
 * is a random id; the name shown to visitors is cleaned separately.
 */
export async function uploadPdf(file: File): Promise<{ url: string; name: string }> {
  if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
    throw new UploadError("unsupported");
  }
  if (file.size > MAX_FILE_BYTES) throw new UploadError("too_large");
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") throw new UploadError("unsupported");

  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UploadError("unauthenticated");

  const path = `${user.id}/files/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    cacheControl: "31536000",
  });
  if (error) {
    console.error("[upload] pdf failed", error);
    throw new UploadError("failed");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl, name: cleanFileName(file.name) };
}

/** "Tarifs 2026 (v2).PDF" → "Tarifs 2026 (v2)": no path, no control characters, 80 max. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return (
    base
      .replace(/\.pdf$/i, "")
      .replace(/[\u0000-\u001f\u007f<>"]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "document"
  );
}

/** Best-effort cleanup when a pro replaces or removes an image. */
export async function deleteImage(publicUrl: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
