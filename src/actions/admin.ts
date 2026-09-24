"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminForAction } from "@/lib/admin/access";
import {
  clearImpersonation,
  impersonationTarget,
  startImpersonation,
} from "@/lib/admin/impersonation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { ActionResult } from "@/lib/validation";

/**
 * Everything the platform console can do to a coach's account.
 *
 * Each action writes one row to admin_audit_log, through the admin's own
 * session, so "who did what, when, to whom" is recorded by the same request
 * that made the change. The log has no update or delete policy: entries can be
 * added and read, never rewritten.
 *
 * The console never uses a service-role client. Every read and write here is
 * allowed by a named policy, so what an admin can reach is reviewable in SQL.
 */

type AuditAction =
  | "extend_trial"
  | "set_subscription"
  | "suspend"
  | "unsuspend"
  | "impersonate_start"
  | "impersonate_stop"
  | "restore_account";

async function audit(
  adminUserId: string,
  action: AuditAction,
  targetProfileId: string | null,
  details: Record<string, unknown>,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
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
 * check reads platform_admins through the caller's session, which the "Admins
 * read the roster" policy allows.
 */
async function targetIsAdmin(profileId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
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

  const supabase = await createSupabaseServerClient();
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

  await audit(admin.id, "extend_trial", profileId, {
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_active: parsed.data.active })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin.id, "set_subscription", profileId, {
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
  if (await targetIsAdmin(parsed.data.profileId)) {
    return { ok: false, error: "admin_account_protected" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspension_reason: parsed.data.reason,
      suspended_by: admin.id,
    })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin.id, "suspend", profileId, { reason: parsed.data.reason });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function unsuspendProfile(profileId: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!idSchema.safeParse(profileId).success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: null, suspension_reason: null, suspended_by: null })
    .eq("id", profileId);

  if (error) return { ok: false, error: "unexpected" };

  await audit(admin.id, "unsuspend", profileId, {});
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

  const supabase = await createSupabaseServerClient();
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

  await audit(admin.id, "restore_account", profileId, { was_deleted_at: profile.deleted_at });
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

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "not_found" };

  await startImpersonation(profile.id);
  await audit(admin.id, "impersonate_start", profile.id, { slug: profile.slug });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function stopImpersonating(): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  // Recorded before clearing, so the log says whose account was left.
  const target = await impersonationTarget();
  await clearImpersonation();
  await audit(admin.id, "impersonate_stop", target, {});

  revalidatePath("/", "layout");
  return { ok: true };
}
