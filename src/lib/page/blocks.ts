import { z } from "zod";

import { defaultWeek } from "./hours";
import { safeUrl, youtubeId } from "./urls";

/**
 * The blocks a page is made of: their types, the shape of each config, and
 * the defaults a new block starts from.
 *
 * One schema per type, used by the editor as the coach types and by the
 * server before anything is written — the server never trusts the client's
 * idea of a valid block. Every text has a length cap and is rendered as text
 * (React escapes it); no block accepts HTML.
 */

export const BLOCK_TYPES = [
  "link",
  "socials",
  "whatsapp",
  "call",
  "email",
  "service",
  "youtube",
  "text",
  "divider",
  "faq",
  "reviews",
  "hours",
  "gallery",
  "pricing",
  "address",
  "file",
  "announcement",
  "stats",
  "vcard",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const MAX_BLOCKS = 30;

/** Where uploaded images and files must live: our own public bucket. */
export const MEDIA_PATH = "/storage/v1/object/public/media/";

export function isMediaUrl(value: string): boolean {
  const href = safeUrl(value);
  if (!href || !href.startsWith("http")) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  return href.startsWith(`${base.replace(/\/+$/, "")}${MEDIA_PATH}`);
}

/* -------------------------------------------------------------------------- */
/* Field helpers                                                               */
/* -------------------------------------------------------------------------- */

const text = (max: number) => z.string().trim().max(max, "too_long");

/** Optional text: empty becomes null, so "nothing typed" is stored once. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .nullish()
    .transform((value) => (value ? value : null));

const required = (max: number) => text(max).min(1, "required");

const url = z
  .string()
  .trim()
  .min(1, "required")
  .max(2000, "too_long")
  .refine((value) => safeUrl(value) !== null, "invalid_url")
  .transform((value) => safeUrl(value) as string);

const webUrl = url.refine((value) => /^https?:/.test(value), "invalid_url");

const phone = z
  .string()
  .trim()
  .min(1, "required")
  .max(40)
  .transform((value) => value.replace(/[^\d+]/g, ""))
  .refine((value) => /^\+?[0-9]{6,20}$/.test(value), "invalid_phone");

const email = z
  .email("invalid_email")
  .max(160)
  .transform((value) => value.toLowerCase());

const media = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => isMediaUrl(value), "invalid_url");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalid_time");

/* -------------------------------------------------------------------------- */
/* Configs                                                                     */
/* -------------------------------------------------------------------------- */

export const blockSchemas = {
  link: z.object({ url: webUrl, title: optional(80) }),
  socials: z.object({ links: z.array(webUrl).min(1, "required").max(12) }),
  whatsapp: z.object({ number: phone, message: optional(300), label: optional(40) }),
  call: z.object({ number: phone, label: optional(40) }),
  email: z.object({ email, label: optional(40) }),
  service: z.object({}),
  youtube: z.object({
    url: z
      .string()
      .trim()
      .min(1, "required")
      .max(300)
      .refine((value) => youtubeId(value) !== null, "invalid_youtube"),
    title: optional(80),
  }),
  text: z
    .object({ title: optional(80), body: optional(1500) })
    .refine((value) => value.title || value.body, { message: "required", path: ["body"] }),
  divider: z.object({}),
  faq: z.object({
    title: optional(80),
    items: z
      .array(z.object({ question: required(160), answer: required(1000) }))
      .min(1, "required")
      .max(12),
  }),
  reviews: z.object({
    layout: z.enum(["carousel", "list"]).default("carousel"),
    items: z
      .array(
        z.object({
          name: required(60),
          text: required(500),
          rating: z.number().int().min(1).max(5),
        }),
      )
      .min(1, "required")
      .max(12),
  }),
  hours: z.object({
    days: z.array(z.object({ closed: z.boolean(), open: time, close: time })).length(7),
    note: optional(160),
  }),
  gallery: z.object({
    mode: z.enum(["grid", "before_after"]).default("grid"),
    images: z
      .array(z.object({ url: media, alt: optional(120) }))
      .min(1, "required")
      .max(12),
  }),
  pricing: z.object({
    title: optional(80),
    items: z
      .array(z.object({ label: required(80), price: required(30), note: optional(120) }))
      .min(1, "required")
      .max(20),
  }),
  address: z.object({ address: required(200), label: optional(80) }),
  file: z.object({
    url: media.refine((value) => /\.pdf$/i.test(value), "invalid_file"),
    name: required(80),
    label: optional(40),
  }),
  announcement: z.object({
    title: required(80),
    text: optional(300),
    buttonLabel: optional(40),
    url: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((value) => (value ? value : null))
      .refine((value) => value === null || safeUrl(value) !== null, "invalid_url")
      .transform((value) => (value ? safeUrl(value) : null)),
  }),
  stats: z.object({
    items: z
      .array(z.object({ value: required(12), label: required(40) }))
      .min(1, "required")
      .max(3),
  }),
  vcard: z.object({
    phone: z
      .string()
      .trim()
      .max(40)
      .nullish()
      .transform((value) => (value ? value.replace(/[^\d+]/g, "") : null))
      .refine((value) => value === null || /^\+?[0-9]{6,20}$/.test(value), "invalid_phone"),
    email: z
      .string()
      .trim()
      .max(160)
      .nullish()
      .transform((value) => (value ? value.toLowerCase() : null))
      .refine((value) => value === null || z.email().safeParse(value).success, "invalid_email"),
    label: optional(40),
  }),
} as const satisfies Record<BlockType, z.ZodType>;

export type BlockConfig<T extends BlockType> = z.output<(typeof blockSchemas)[T]>;
export type AnyBlockConfig = BlockConfig<BlockType>;

/** A block as the renderer and the editor hold it. */
export type PageBlock<T extends BlockType = BlockType> = {
  id: string;
  type: T;
  config: BlockConfig<T>;
  visible: boolean;
  offerId: string | null;
  /** Editor preview only: a block still to complete, drawn as a placeholder. */
  pending?: boolean;
};

/** A block as stored: config not yet trusted. */
export type StoredBlock = {
  id: string;
  type: string;
  config: unknown;
  visible: boolean;
  offer_id: string | null;
};

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && (BLOCK_TYPES as readonly string[]).includes(value);
}

/**
 * Stored rows → renderable blocks. A row whose config no longer validates is
 * dropped from the public page rather than rendered half-broken.
 */
export function parseBlocks(rows: StoredBlock[]): PageBlock[] {
  const blocks: PageBlock[] = [];
  for (const row of rows) {
    if (!isBlockType(row.type)) continue;
    const parsed = blockSchemas[row.type].safeParse(row.config ?? {});
    if (!parsed.success) continue;
    blocks.push({
      id: row.id,
      type: row.type,
      config: parsed.data,
      visible: row.visible,
      offerId: row.offer_id,
    });
  }
  return blocks;
}

/**
 * What a new block starts with. Enough to be useful at once, never a fake
 * value that would reach a client: a block that needs a URL starts empty and
 * stays hidden from the public page until it validates.
 */
export function defaultConfig(
  type: BlockType,
  profile: { phone: string | null; whatsapp: string | null; email: string | null },
): Record<string, unknown> {
  switch (type) {
    case "link":
      return { url: "", title: null };
    case "socials":
      return { links: [""] };
    case "whatsapp":
      return { number: profile.whatsapp ?? "", message: null, label: null };
    case "call":
      return { number: profile.phone ?? "", label: null };
    case "email":
      return { email: profile.email ?? "", label: null };
    case "youtube":
      return { url: "", title: null };
    case "text":
      return { title: "", body: "" };
    case "faq":
      return { title: null, items: [{ question: "", answer: "" }] };
    case "reviews":
      return { layout: "carousel", items: [{ name: "", text: "", rating: 5 }] };
    case "hours":
      return { days: defaultWeek(), note: null };
    case "gallery":
      return { mode: "grid", images: [] };
    case "pricing":
      return { title: null, items: [{ label: "", price: "", note: null }] };
    case "address":
      return { address: "", label: null };
    case "file":
      return { url: "", name: "", label: null };
    case "announcement":
      return { title: "", text: null, buttonLabel: null, url: null };
    case "stats":
      return {
        items: [
          { value: "", label: "" },
          { value: "", label: "" },
          { value: "", label: "" },
        ],
      };
    case "vcard":
      return { phone: profile.phone, email: profile.email, label: null };
    case "service":
    case "divider":
      return {};
  }
}

/** Validates a config for a type: the value to store, or field errors. */
export function validateBlock(
  type: BlockType,
  config: unknown,
): { ok: true; config: AnyBlockConfig } | { ok: false; errors: Record<string, string> } {
  const parsed = blockSchemas[type].safeParse(config ?? {});
  if (parsed.success) return { ok: true, config: parsed.data as AnyBlockConfig };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
