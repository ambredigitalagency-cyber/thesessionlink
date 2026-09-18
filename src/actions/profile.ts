"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, getCurrentUser, requireProfileForAction } from "@/lib/auth";
import { toLocale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  profileBasicsSchema,
  profileDetailsSchema,
  slugSchema,
  type ActionResult,
} from "@/lib/validation";

function revalidateProfile(slug: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${slug}`);
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { available: false };

  const user = await getCurrentUser();
  if (!user) return { available: false };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("is_slug_available", { p_slug: parsed.data });
  return { available: data === true };
}

/** Onboarding step 2: creates the profile and the public link. */
export async function createProfile(input: {
  display_name: string;
  slug: string;
  category_id: string | null;
  timezone?: string | null;
  locale?: string | null;
}): Promise<ActionResult<{ slug: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const existing = await getCurrentProfile();
  if (existing) return { ok: true, data: { slug: existing.slug } };

  const parsed = profileBasicsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: available } = await supabase.rpc("is_slug_available", {
    p_slug: parsed.data.slug,
  });

  if (available !== true) {
    return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
  }

  // TODO(billing): the 14-day trial requires a bank card. Once Stripe/PayPal is
  // integrated, collect and verify a payment method before this insert and
  // refuse to create the profile without one. Until then signup stays open:
  // trial_ends_at defaults to now() + 14 days and nothing is gated on it.
  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    display_name: parsed.data.display_name,
    slug: parsed.data.slug,
    category_id: parsed.data.category_id,
    contact_email: user.email?.toLowerCase() ?? null,
    locale: toLocale(input.locale),
    timezone: input.timezone || "Europe/Paris",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
    }
    console.error("[profile] create failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath("/onboarding", "layout");
  revalidateProfile(parsed.data.slug);
  return { ok: true, data: { slug: parsed.data.slug } };
}

/** Dashboard › Profile: public information and appearance. */
export async function updateProfile(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const profile = await requireProfileForAction();

  const parsed = profileDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();

  if (parsed.data.slug !== profile.slug) {
    const { data: available } = await supabase.rpc("is_slug_available", {
      p_slug: parsed.data.slug,
    });
    if (available !== true) {
      return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      slug: parsed.data.slug,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      location: parsed.data.location,
      avatar_url: parsed.data.avatar_url,
      category_id: parsed.data.category_id,
      social_links: parsed.data.social_links,
      theme: parsed.data.theme,
      calendar_visible: parsed.data.calendar_visible,
      custom_closed_message: parsed.data.custom_closed_message,
    })
    .eq("id", profile.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
    }
    console.error("[profile] update failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateProfile(profile.slug);
  if (parsed.data.slug !== profile.slug) revalidatePath(`/${parsed.data.slug}`);

  return { ok: true, data: { slug: parsed.data.slug } };
}

/** The "temporarily invisible calendar" switch. */
export async function setCalendarVisibility(
  visible: boolean,
  closedMessage?: string | null,
): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      calendar_visible: visible,
      ...(closedMessage !== undefined
        ? { custom_closed_message: closedMessage?.trim() || null }
        : {}),
    })
    .eq("id", profile.id);

  if (error) {
    console.error("[profile] visibility update failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateProfile(profile.slug);
  return { ok: true };
}
