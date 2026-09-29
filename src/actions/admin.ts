"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { adminDb, requireAdminForAction, type AdminActor } from "@/lib/admin/access";
import { sendBookingStatusUpdate } from "@/lib/emails/send";
import { prepareOffer } from "@/lib/offers/prepare";
import { parseActionConfig } from "@/lib/offers/schema";
import {
  clearImpersonation,
  impersonationTarget,
  startImpersonation,
} from "@/lib/admin/impersonation";
import type { Json } from "@/lib/supabase/database.types";
import type { ActionResult } from "@/lib/validation";
import { offerFreedSlot } from "@/lib/waitlist";

/**
 * Everything the platform console can do to a coach's account.
 *
 * Each action writes one row to admin_audit_log, through the admin's own
 * session, so "who did what, when, to whom" is recorded by the same request
 * that made the change. The log has no update or delete policy: entries can be
 * added and read, never rewritten.
 *
 * A platform_admins member works through their own session: every read and
 * write is allowed by a named policy, so what they can reach is reviewable in
 * SQL. The console password (solo/demo, see lib/admin/password-access.ts) has
 * no session, so `adminDb` hands it the service role — and the journal marks
 * those rows via = 'password', since there is no user to name.
 */

type AuditAction =
  | "extend_trial"
  | "set_subscription"
  | "suspend"
  | "unsuspend"
  | "impersonate_start"
  | "impersonate_stop"
  | "restore_account"
  | "edit_offer"
  | "edit_booking"
  | "export_data";

async function audit(
  actor: AdminActor,
  action: AuditAction,
  targetProfileId: string | null,
  details: Record<string, unknown>,
) {
  const supabase = await adminDb(actor);
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_user_id: actor.kind === "member" ? actor.userId : null,
    via: actor.kind,
    action,
    target_profile_id: targetProfileId,
    details: details as Json,
  });

  // An unrecorded action is worse than a refused one: say so loudly.
  if (error) console.error("[admin] audit write failed", action, error.code, error.message);
}

const idSchema = z.uuid();

/**
 * Admin accounts are out of reach of moderation.
 *
 * Suspending one — including your own — would lock the platform's own staff out
 * of the console, and there is no screen to undo it from once locked out. The
 * check reads platform_admins through the caller's client, which the "Admins
 * read the roster" policy allows for members.
 */
async function targetIsAdmin(actor: AdminActor, profileId: string): Promise<boolean> {
  const supabase = await adminDb(actor);
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.user_id) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  return Boolean(data);
}

export async function extendTrial(profileId: string, days: number): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = z
    .object({ profileId: idSchema, days: z.number().int().min(1).max(365) })
    .safeParse({
      profileId,
      days,
    });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_ends_at")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "not_found" };

  // Extend from today when the trial already lapsed, otherwise from its end.
  const from = new Date(Math.max(Date.now(), new Date(profile.trial_ends_at).getTime()));
  const trialEndsAt = new Date(from.getTime() + parsed.data.days * 86_400_000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ trial_ends_at: trialEndsAt })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin, "extend_trial", profileId, {
    days: parsed.data.days,
    from: profile.trial_ends_at,
    to: trialEndsAt,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setSubscription(
  profileId: string,
  active: boolean,
  reason: string,
): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = z
    .object({ profileId: idSchema, active: z.boolean(), reason: z.string().trim().max(500) })
    .safeParse({ profileId, active, reason });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_active: parsed.data.active })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin, "set_subscription", profileId, {
    active: parsed.data.active,
    reason: parsed.data.reason || null,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function suspendProfile(profileId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = z
    .object({ profileId: idSchema, reason: z.string().trim().min(3, "required").max(500) })
    .safeParse({ profileId, reason });
  if (!parsed.success) return { ok: false, error: "reason_required" };
  if (await targetIsAdmin(admin, parsed.data.profileId)) {
    return { ok: false, error: "admin_account_protected" };
  }

  const supabase = await adminDb(admin);
  const { error } = await supabase
    .from("profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspension_reason: parsed.data.reason,
      suspended_by: admin.kind === "member" ? admin.userId : null,
    })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin, "suspend", profileId, { reason: parsed.data.reason });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function unsuspendProfile(profileId: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(profileId).success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: null, suspension_reason: null, suspended_by: null })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin, "unsuspend", profileId, {});
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Brings back an account the coach asked to delete, before the purge runs.
 *
 * Deliberately admin-only: the coach has no way to undo their own deletion —
 * they contact support, and this is what support clicks. Clearing deleted_at
 * takes the profile out of reach of purge_deleted_accounts() and puts the
 * public page back online.
 */
export async function restoreAccount(profileId: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(profileId).success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "not_found" };
  if (!profile.deleted_at) return { ok: false, error: "not_pending_deletion" };

  const { error } = await supabase
    .from("profiles")
    // The warning stamp goes too: if they ever leave again, they get warned
    // again.
    .update({ deleted_at: null, deletion_warned_at: null })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin, "restore_account", profileId, { was_deleted_at: profile.deleted_at });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Look at the product through a coach's account, to reproduce what they see.
 *
 * Read-only by construction: the dashboard then runs on the admin's own
 * session, and the admin policies grant SELECT only — an attempt to write as
 * the coach is refused by the database, not by a flag in the UI.
 */
export async function impersonate(profileId: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(profileId).success) return { ok: false, error: "invalid_input" };
  // The dashboard reads the coach's data through the admin's own Supabase
  // session. The password door has none, so it cannot look through.
  if (admin.kind === "password") return { ok: false, error: "impersonation_needs_account" };

  const supabase = await adminDb(admin);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "not_found" };

  await startImpersonation(profile.id);
  await audit(admin, "impersonate_start", profile.id, { slug: profile.slug });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function stopImpersonating(): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  // Recorded before clearing, so the log says whose account was left.
  const target = await impersonationTarget();
  await clearImpersonation();
  await audit(admin, "impersonate_stop", target, {});

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Internal notes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A note left on a coach's file for the other admins. Not audited: the note is
 * its own record — author and date included — and the coach's account is not
 * changed by it.
 */
export async function addCoachNote(profileId: string, body: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = z
    .object({ profileId: idSchema, body: z.string().trim().min(1, "required").max(2000) })
    .safeParse({ profileId, body });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  const { error } = await supabase.from("admin_notes").insert({
    profile_id: parsed.data.profileId,
    author_user_id: admin.kind === "member" ? admin.userId : null,
    via: admin.kind,
    body: parsed.data.body,
  });

  if (error) {
    console.error("[admin] note insert failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath(`/admin/coaches/${parsed.data.profileId}`);
  return { ok: true };
}

/** Removes one of the caller's own notes; nobody removes anyone else's. */
export async function deleteCoachNote(noteId: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(noteId).success) return { ok: false, error: "invalid_input" };

  const supabase = await adminDb(admin);
  let query = supabase.from("admin_notes").delete().eq("id", noteId);
  // The service role bypasses the policy, so the password door is held to its
  // own notes here, as a member is by RLS.
  if (admin.kind === "password") query = query.eq("via", "password");
  const { data, error } = await query.select("profile_id").maybeSingle();

  if (error) return { ok: false, error: "unexpected" };
  if (!data) return { ok: false, error: "not_found" };

  revalidatePath(`/admin/coaches/${data.profile_id}`);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Direct interventions                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Edits a coach's offer from the console.
 *
 * Same validation as the coach's own form (lib/offers/prepare), same columns,
 * never the photos: those are uploaded under the coach's own storage folder,
 * so they stay the coach's to change. Every edit is journaled with the fields
 * that changed.
 */
export async function adminUpdateOffer(offerId: string, input: unknown): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(offerId).success) return { ok: false, error: "invalid_input" };

  const prepared = prepareOffer(input);
  if (!prepared.ok) return { ok: false, error: prepared.error, fieldErrors: prepared.fieldErrors };

  const supabase = await adminDb(admin);
  const { data: before } = await supabase
    .from("offers")
    .select(
      "id, profile_id, title, description, price, price_type, action_type, action_config, custom_fields, is_active, photos, profiles(slug)",
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };

  // Photos are the coach's: an intervention never carries them.
  const values: Omit<typeof prepared.values, "photos"> = { ...prepared.values };
  delete (values as Partial<typeof prepared.values>).photos;
  const { error } = await supabase.from("offers").update(values).eq("id", offerId);
  if (error) {
    console.error("[admin] offer update failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  // Compare like with like: the stored config may lack keys that validation
  // fills with their defaults, which is not a change anyone made.
  const previous = {
    ...before,
    action_config: parseActionConfig(before.action_type, before.action_config),
  };
  const changed = (Object.keys(values) as (keyof typeof values)[]).filter(
    (key) =>
      JSON.stringify(values[key] ?? null) !==
      JSON.stringify(previous[key as keyof typeof previous] ?? null),
  );
  await audit(admin, "edit_offer", before.profile_id, {
    offer_id: offerId,
    title: values.title,
    changed,
  });

  const slug = (before.profiles as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/${slug}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const bookingInterventionSchema = z.object({
  bookingId: idSchema,
  change: z.enum(["confirm", "cancel", "mark_no_show", "clear_no_show"]),
  note: z.string().trim().max(1000).optional(),
  notifyClient: z.boolean().default(true),
});

/**
 * Changes a booking's status from the console: confirm, cancel, or mark the
 * client absent (and take it back). The rules are the coach's: a no-show is
 * only for a confirmed session already started. Confirming and cancelling
 * email the client like the coach's own buttons do, unless the admin unticks
 * it. An optional note is appended to the booking's internal notes, signed
 * "Console", so the coach sees what was done and why.
 */
export async function adminUpdateBooking(input: {
  bookingId: string;
  change: "confirm" | "cancel" | "mark_no_show" | "clear_no_show";
  note?: string;
  notifyClient?: boolean;
}): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = bookingInterventionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { bookingId, change, note, notifyClient } = parsed.data;

  const supabase = await adminDb(admin);
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, profile_id, status, no_show, starts_at, internal_notes, offer_title")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "not_found" };

  const patch: {
    status?: "confirmed" | "cancelled";
    cancelled_at?: string | null;
    cancelled_by?: "pro" | null;
    no_show?: boolean;
    internal_notes?: string;
  } = {};

  if (change === "confirm") {
    patch.status = "confirmed";
    patch.cancelled_at = null;
    patch.cancelled_by = null;
  } else if (change === "cancel") {
    patch.status = "cancelled";
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_by = "pro";
  } else {
    if (booking.status !== "confirmed" || !booking.starts_at)
      return { ok: false, error: "not_available" };
    if (new Date(booking.starts_at) > new Date()) return { ok: false, error: "session_not_past" };
    patch.no_show = change === "mark_no_show";
  }

  if (note) {
    const stamp = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date());
    patch.internal_notes = [booking.internal_notes, `[Console · ${stamp}] ${note}`]
      .filter(Boolean)
      .join("\n\n");
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error || !updated) {
    if (error?.code === "23P01") return { ok: false, error: "slot_taken" };
    console.error("[admin] booking update failed", error?.code, error?.message);
    return { ok: false, error: "unexpected" };
  }

  const emails = notifyClient && (change === "confirm" || change === "cancel");
  if (emails) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.profile_id)
      .single();
    if (profile) after(async () => sendBookingStatusUpdate({ booking: updated, profile }));
  }
  if (change === "cancel") after(() => offerFreedSlot(updated));

  await audit(admin, "edit_booking", booking.profile_id, {
    booking_id: bookingId,
    offer: booking.offer_title,
    change,
    from: change.endsWith("no_show") ? { no_show: booking.no_show } : { status: booking.status },
    client_notified: Boolean(emails),
    note: note || null,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}
