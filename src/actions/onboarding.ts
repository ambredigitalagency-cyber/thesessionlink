"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { getCurrentProfile, getCurrentUser, requireProfileForAction } from "@/lib/auth";
import { toLocale } from "@/lib/i18n/config";
import { slugWordFor, themeForCategory } from "@/lib/onboarding/config";
import { planPrimary } from "@/lib/onboarding/primary";
import { slugCandidates, slugShape, type SlugStatus } from "@/lib/onboarding/slug";
import { THEME_IDS } from "@/lib/page/themes";
import { loadPagePreview, type PagePreview } from "@/lib/page/preview";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, profileBasicsSchema, type ActionResult } from "@/lib/validation";

/**
 * The sign-up's four screens, server side.
 *
 * None of them takes the browser's word for where the account stands: each
 * one checks the data it depends on (a profile exists, the page is not yet
 * published…) and the database functions behind them check again. A request
 * replayed, sent twice or sent out of order changes nothing it should not.
 */

const idSchema = z.uuid();

async function categorySlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string | null,
) {
  if (!id) return null;
  const { data } = await supabase
    .from("activity_categories")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  return data?.slug ?? null;
}

/* -------------------------------------------------------------------------- */
/* 1. The trade                                                                */
/* -------------------------------------------------------------------------- */

export async function chooseCategory(categoryId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!idSchema.safeParse(categoryId).success) return { ok: false, error: "invalid_input" };

  const profile = await getCurrentProfile();
  // Past the link, the trade is changed in "Ma page", not here.
  if (profile) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("onboarding_advance", {
    p_step: "identity",
    p_category_id: categoryId,
  });
  if (error) {
    if (error.message.includes("invalid_category")) return { ok: false, error: "invalid_input" };
    console.error("[onboarding] category failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* 2. The name and the link                                                    */
/* -------------------------------------------------------------------------- */

export type SlugCheck = { status: SlugStatus | "limited"; suggestions: string[] };

/**
 * Live status of a link as it is typed, and up to three free alternatives
 * when it is taken or reserved. Rate limited per account: 90 checks a minute
 * is far more than typing produces, and far less than enumerating every
 * coach's link would need.
 */
export async function checkSlug(
  rawSlug: string,
  categorySlugHint?: string | null,
): Promise<SlugCheck> {
  const user = await getCurrentUser();
  if (!user) return { status: "invalid", suggestions: [] };

  const slug = typeof rawSlug === "string" ? rawSlug.trim().toLowerCase().slice(0, 60) : "";
  const shape = slugShape(slug);
  if (shape === "invalid") return { status: "invalid", suggestions: [] };

  const admin = createSupabaseAdminClient();
  const { data: allowed, error: limitError } = await admin.rpc("check_rate_limit", {
    p_bucket: `slug_check:${user.id}`,
    p_limit: 90,
    p_window: "00:01:00",
  });
  if (!limitError && allowed === false) return { status: "limited", suggestions: [] };

  const supabase = await createSupabaseServerClient();
  let status: SlugStatus = shape === "reserved" ? "reserved" : "free";
  if (status === "free") {
    const { data: available } = await supabase.rpc("is_slug_available", { p_slug: slug });
    status = available === true ? "free" : "taken";
  }
  if (status === "free") return { status, suggestions: [] };

  const locale = await getLocale();
  const word = slugWordFor(
    typeof categorySlugHint === "string" ? categorySlugHint.slice(0, 40) : null,
    locale,
  );
  const { data: free } = await supabase.rpc("available_slugs", {
    p_slugs: slugCandidates(slug, word),
  });
  return { status, suggestions: (free ?? []).slice(0, 3) };
}

/**
 * Writes the profile: from here the link is reserved and answers with its
 * "being set up" page. The trade comes from the progress the server stored
 * at the first screen, the theme from the trade.
 */
export async function createIdentity(input: {
  display_name: string;
  slug: string;
  locale?: string | null;
  timezone?: string | null;
}): Promise<ActionResult<{ slug: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const existing = await getCurrentProfile();
  if (existing) return { ok: true, data: { slug: existing.slug } };

  const supabase = await createSupabaseServerClient();
  const { data: progress } = await supabase
    .from("onboarding_progress")
    .select("category_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const parsed = profileBasicsSchema.safeParse({
    display_name: input.display_name,
    slug: input.slug,
    category_id: progress?.category_id ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { data: available } = await supabase.rpc("is_slug_available", {
    p_slug: parsed.data.slug,
  });
  if (available !== true) {
    return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
  }

  const timezone =
    typeof input.timezone === "string" &&
    /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(input.timezone)
      ? input.timezone
      : "Europe/Paris";

  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    display_name: parsed.data.display_name,
    slug: parsed.data.slug,
    category_id: parsed.data.category_id,
    contact_email: user.email?.toLowerCase() ?? null,
    locale: toLocale(input.locale),
    timezone,
    theme: themeForCategory(await categorySlug(supabase, parsed.data.category_id)),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
    }
    console.error("[onboarding] create profile failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  const { error: stepError } = await supabase.rpc("onboarding_advance", { p_step: "button" });
  if (stepError) console.error("[onboarding] advance failed", stepError.code, stepError.message);

  revalidatePath(`/${parsed.data.slug}`);
  return { ok: true, data: { slug: parsed.data.slug } };
}

/* -------------------------------------------------------------------------- */
/* 3. The main button — the page goes live                                     */
/* -------------------------------------------------------------------------- */

export async function publishPage(input: unknown): Promise<ActionResult<PagePreview>> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();
  const t = await getTranslations({ locale: toLocale(profile.locale), namespace: "onboarding" });

  const plan = planPrimary(input, {
    categorySlug: await categorySlug(supabase, profile.category_id),
    offerTitle: t("button.message.offerTitle"),
  });
  if (!plan.ok) return { ok: false, error: "invalid_input", fieldErrors: plan.errors };

  const { error } = await supabase.rpc("onboarding_publish", {
    p_kind: plan.plan.kind,
    p_block: plan.plan.block as never,
    p_offer_title: plan.plan.offerTitle as string,
    p_pending: plan.plan.pending as never,
  });
  if (error) {
    console.error("[onboarding] publish failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath(`/${profile.slug}`);
  revalidatePath("/dashboard", "layout");

  const fresh = await getFreshProfile(supabase, profile.id);
  return { ok: true, data: await loadPagePreview(supabase, fresh ?? profile) };
}

/* -------------------------------------------------------------------------- */
/* 4. The look                                                                 */
/* -------------------------------------------------------------------------- */

export async function chooseTheme(theme: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  if (!(THEME_IDS as readonly string[]).includes(theme))
    return { ok: false, error: "invalid_input" };
  if (!profile.onboarding_completed_at) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", profile.id);
  if (error) {
    console.error("[onboarding] theme failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  const { error: stepError } = await supabase.rpc("onboarding_advance", { p_step: "done" });
  if (stepError) {
    console.error("[onboarding] finish failed", stepError.code, stepError.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath(`/${profile.slug}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

async function getFreshProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
) {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}
