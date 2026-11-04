"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { serverEnv } from "@/lib/env";
import { slugCandidates, slugShape, type SlugStatus } from "@/lib/onboarding/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ipFrom } from "@/lib/tracking/visitor";

export type PublicSlugCheck = { status: SlugStatus | "limited"; suggestions: string[] };

/**
 * "Choose your link" on the landing: is this link free, for a visitor who has
 * no account yet. Same rules as the sign-up — the shape and the reserved
 * words from the shared slug logic, then whether any profile holds it — and
 * up to three free alternatives when it is taken.
 *
 * Rate limited per visitor: 40 checks a minute, plenty for typing, far too
 * few to list every coach's link. The visitor is known by a hash of their IP
 * address, never the address itself. The answer only ever says "free" or
 * "taken": the profile behind a taken link is never read out.
 */
export async function checkPublicSlug(raw: string): Promise<PublicSlugCheck> {
  const slug = typeof raw === "string" ? raw.trim().toLowerCase().slice(0, 60) : "";
  const shape = slugShape(slug);
  if (shape === "invalid") return { status: "invalid", suggestions: [] };

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { status: "limited", suggestions: [] };
  }

  const visitor = createHash("sha256")
    .update(`${serverEnv.trackingSecret ?? ""}:${ipFrom(await headers())}`)
    .digest("hex")
    .slice(0, 32);
  const { data: allowed, error: limitError } = await admin.rpc("check_rate_limit", {
    p_bucket: `slug_public:${visitor}`,
    p_limit: 40,
    p_window: "00:01:00",
  });
  if (!limitError && allowed === false) return { status: "limited", suggestions: [] };

  const candidates = slugCandidates(slug, "pro");
  const { data: rows, error } = await admin
    .from("profiles")
    .select("slug")
    .in("slug", [slug, ...candidates]);
  if (error) {
    console.error("[landing] slug check failed", error.code, error.message);
    return { status: "limited", suggestions: [] };
  }

  const held = new Set((rows ?? []).map((row) => row.slug));
  const status: SlugStatus = shape === "reserved" ? "reserved" : held.has(slug) ? "taken" : "free";
  return {
    status,
    suggestions:
      status === "free" ? [] : candidates.filter((candidate) => !held.has(candidate)).slice(0, 3),
  };
}
