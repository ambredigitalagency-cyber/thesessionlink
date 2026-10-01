"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, getCurrentUser, requireProfileForAction } from "@/lib/auth";
import { toLocale } from "@/lib/i18n/config";
import type { OfferField } from "@/lib/offers/fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  onboardingProfileSchema,
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
      custom_fields: parsed.data.custom_fields,
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

/**
 * Onboarding, one screen at a time.
 *
 * Saves what a single screen collected and nothing else. Two reasons it is a
 * patch and not `updateProfile`:
 *
 *   * `updateProfile` validates the whole public profile — name, slug, theme —
 *     so calling it from a screen that only knows a phone number would mean
 *     that screen resending fields it has no business owning, and overwriting
 *     them with whatever it happened to be holding.
 *   * Saving per screen means abandoning the flow halfway keeps what was
 *     already answered. The alternative — collecting everything and writing it
 *     at the end — throws away four screens of typing if someone closes the
 *     tab on the fifth.
 *
 * It no longer refuses a finished onboarding: those screens are now the
 * finishing touches, walked after the first offer has already stamped
 * onboarding_completed_at. That is safe for the reason above — it writes only
 * the keys a screen sent, through the same field rules as the dashboard — so
 * it cannot clobber anything the coach has set elsewhere.
 */
export async function updateOnboardingProfile(input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();

  const parsed = onboardingProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Only the keys this screen actually sent: an absent key is "not my screen",
  // which is not the same as "clear it". Spelled out rather than filtered from
  // the parsed object, so the column names stay typed against the table.
  const data = parsed.data;
  const patch: {
    avatar_url?: string | null;
    bio?: string | null;
    location?: string | null;
    phone_number?: string | null;
    whatsapp_number?: string | null;
    social_links?: Record<string, string | null>;
    custom_fields?: OfferField[];
  } = {};

  if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.location !== undefined) patch.location = data.location;
  if (data.phone_number !== undefined) patch.phone_number = data.phone_number;
  if (data.whatsapp_number !== undefined) patch.whatsapp_number = data.whatsapp_number;
  if (data.social_links !== undefined) patch.social_links = data.social_links;
  if (data.custom_fields !== undefined) patch.custom_fields = data.custom_fields;

  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);

  if (error) {
    console.error("[profile] onboarding update failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidateProfile(profile.slug);
  return { ok: true };
}

/*
 * Onboarding ends with the first offer again: the offers_complete_onboarding
 * trigger stamps onboarding_completed_at on that insert, which is the moment
 * the page has something to sell. (For a while the offer waited for the
 * dashboard and the last profile screen stamped it instead; that action is
 * gone with that order.)
 */

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
