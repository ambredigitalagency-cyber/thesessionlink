"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { impersonationTarget } from "@/lib/admin/impersonation";
import { getCurrentUser, requireProfileForAction } from "@/lib/auth";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, settingsSchema, type ActionResult } from "@/lib/validation";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Language switcher (public pages included). */
export async function setLocale(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "invalid_input" };

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  return { ok: true };
}

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      contact_email: parsed.data.contact_email,
      phone_number: parsed.data.phone_number,
      whatsapp_number: parsed.data.whatsapp_number,
      contact_channels: parsed.data.contact_channels,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      reminder_hours_before: parsed.data.reminder_hours_before,
      notify_new_bookings: parsed.data.notify_new_bookings,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("[settings] update failed", error);
    return { ok: false, error: "unexpected" };
  }

  // Keep the UI language in sync with the saved preference.
  await setLocale(parsed.data.locale as Locale);

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${profile.slug}`);
  return { ok: true };
}

/**
 * "Delete my account" — a decision the coach can still go back on.
 *
 * It used to delete the auth user, and everything cascaded: profile, offers,
 * bookings, clients, in one click with nothing to restore from. Now the click
 * marks the profile instead. Access stops immediately — the dashboard sends
 * them to an explanation, the public page stops resolving, no booking can
 * reach them — while the rows stay put. purge_deleted_accounts() performs the
 * real deletion after the grace period, and until then an admin can undo it.
 *
 * auth.users is deliberately untouched: it is the cascade's root, and removing
 * it is precisely what this action stopped doing.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  // This one does not go through requireProfileForAction, and it acts on the
  // *signed-in* account — an admin clicking it while impersonating would mark
  // their own. Refuse outright.
  if (await impersonationTarget()) return { ok: false, error: "impersonation_is_read_only" };

  if (confirmation.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: marked, error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), deletion_warned_at: null })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[settings] account deletion failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  // Already marked, or no profile at all: either way there is nothing left to
  // do but end the session.
  if (!marked) console.warn("[settings] deletion requested with nothing to mark");

  await supabase.auth.signOut();
  redirect("/");
}
