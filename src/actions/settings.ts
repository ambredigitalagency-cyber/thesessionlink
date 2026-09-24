"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { impersonationTarget } from "@/lib/admin/impersonation";
import { getCurrentUser, requireProfileForAction } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
 * Deletes the auth user; profile, offers, bookings and clients cascade.
 * Requires a service key — without one we refuse rather than half-delete.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  // This one does not go through requireProfileForAction, and it deletes the
  // *signed-in* account — an admin clicking it while impersonating would erase
  // their own. Refuse outright.
  if (await impersonationTarget()) return { ok: false, error: "impersonation_is_read_only" };

  if (confirmation.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  if (!serverEnv.supabaseSecretKey) {
    return { ok: false, error: "not_available" };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[settings] account deletion failed", error);
    return { ok: false, error: "unexpected" };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
