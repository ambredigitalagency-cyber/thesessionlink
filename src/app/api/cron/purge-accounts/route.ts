import { NextResponse, type NextRequest } from "next/server";

import { DELETION_GRACE_DAYS } from "@/lib/account/deletion";
import { purgeUserFiles } from "@/lib/account/purge";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The 30-day purge, files included.
 *
 * Triggered nightly by pg_cron (dispatch_account_purge, 03:15). For each
 * account marked deleted 30 days ago or more: its Storage folder first, then
 * the auth user, which cascades to the profile, offers, blocks and page
 * statistics. An account whose files could not all be removed is left for the
 * next night rather than deleted with files behind it; the SQL purge
 * (purge_deleted_accounts, two days later) remains the safety net.
 */
async function purge(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 86_400_000).toISOString();
  const { data: due, error } = await supabase
    .from("profiles")
    .select("id, user_id")
    .not("deleted_at", "is", null)
    .lte("deleted_at", cutoff)
    .limit(50);
  if (error) {
    console.error("[cron] purge listing failed", error.code, error.message);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  let purged = 0;
  let files = 0;
  let failed = 0;
  for (const profile of due ?? []) {
    try {
      files += await purgeUserFiles(supabase.storage.from("media"), profile.user_id);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.user_id);
      if (deleteError) throw deleteError;
      purged += 1;
    } catch (caught) {
      failed += 1;
      console.error("[cron] purge failed for profile", profile.id, caught);
    }
  }

  return NextResponse.json({ due: due?.length ?? 0, purged, files, failed });
}

export const POST = purge;
export const GET = purge;
