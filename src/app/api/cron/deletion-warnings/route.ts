import { NextResponse, type NextRequest } from "next/server";

import {
  DELETION_GRACE_DAYS,
  DELETION_WARNING_DAYS,
  deletionDaysLeft,
  deletionDueAt,
} from "@/lib/account/deletion";
import { sendAccountDeletionWarning } from "@/lib/emails/send";
import { serverEnv, supportAddress } from "@/lib/env";
import { toLocale } from "@/lib/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Warns coaches whose account is about to be purged, a week before it happens.
 *
 * Triggered daily by pg_cron (see the soft-delete migration), an hour before
 * the purge job, so a warning is never sent the same night an account goes.
 *
 * claim_due_deletion_warnings() stamps the rows it returns, so concurrent runs
 * never send twice; a failed send clears the stamp again so the next run
 * retries it.
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  const provided = request.headers.get("authorization");

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: profiles, error } = await supabase.rpc("claim_due_deletion_warnings", {
    p_grace_days: DELETION_GRACE_DAYS,
    p_warn_days: DELETION_WARNING_DAYS,
    p_limit: 50,
  });

  if (error) {
    console.error("[cron] deletion warning claim failed", error.code, error.message);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const support = supportAddress();
  let sent = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    if (!profile.deleted_at) continue;

    // The contact address is the coach's choice; the account address is the
    // one that always exists.
    let to = profile.contact_email;
    if (!to && profile.user_id) {
      const { data } = await supabase.auth.admin.getUserById(profile.user_id);
      to = data.user?.email ?? null;
    }

    if (!to) {
      failed += 1;
      console.error("[cron] no address to warn profile", profile.id);
      continue;
    }

    const result = await sendAccountDeletionWarning({
      to,
      locale: toLocale(profile.locale),
      dueAt: deletionDueAt(profile.deleted_at),
      // Counted from the real date rather than assumed to be the warning
      // window: a row the job picks up late must not promise more days than
      // the date beside it shows.
      daysLeft: deletionDaysLeft(profile.deleted_at),
      supportEmail: support,
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      // Release the claim so the next run retries this warning.
      await supabase.from("profiles").update({ deletion_warned_at: null }).eq("id", profile.id);
    }
  }

  return NextResponse.json({ claimed: profiles?.length ?? 0, sent, failed });
}
