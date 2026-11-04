import { NextResponse, type NextRequest } from "next/server";

import { accessEndsAt, offlineAt } from "@/lib/billing/access";
import { sendAccessEmail, type AccessEmailKind } from "@/lib/emails/send";
import { serverEnv, siteUrl } from "@/lib/env";
import { toLocale } from "@/lib/i18n/config";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

/**
 * The end-of-trial emails, once a day (pg_cron, dispatch_access_emails).
 *
 * claim_access_emails() decides who is due which email and records the claim
 * in access_emails in the same statement, so two runs never send the same
 * email twice; a failed send deletes its claim so the next run retries it.
 */
async function run(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: due, error } = await supabase.rpc("claim_access_emails", { p_limit: 50 });
  if (error) {
    console.error("[cron] access email claim failed", error.code, error.message);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const now = Date.now();
  let sent = 0;
  let failed = 0;

  for (const row of due ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_ends_at, subscription_active, subscription_ended_at")
      .eq("id", row.profile_id)
      .maybeSingle();

    let to: string | null = row.contact_email;
    if (!to && row.user_id) {
      const { data } = await supabase.auth.admin.getUserById(row.user_id);
      to = data.user?.email ?? null;
    }

    const kind = row.kind as AccessEmailKind;
    // The date each email speaks of: the end of the trial for the first one,
    // the page going offline for the three others.
    const fields = profile ?? { trial_ends_at: row.period_end, subscription_active: false };
    const date =
      kind === "trial_ending"
        ? (accessEndsAt(fields) ?? new Date(row.period_end))
        : (offlineAt(fields) ?? new Date(row.period_end));

    const result = to
      ? await sendAccessEmail({
          to,
          locale: toLocale(row.locale),
          kind,
          date,
          daysLeft: Math.max(1, Math.ceil((date.getTime() - now) / DAY)),
          price: PLAN_PRICE_MONTHLY,
          subscribeUrl: absoluteUrl("/dashboard", siteUrl),
        })
      : { ok: false as const };

    if (result.ok) {
      sent += 1;
      await supabase
        .from("access_emails")
        .update({ status: "sent" })
        .eq("profile_id", row.profile_id)
        .eq("kind", row.kind)
        .eq("period_end", row.period_end);
    } else {
      failed += 1;
      console.error("[cron] access email not sent", row.profile_id, row.kind);
      // Released: the next run tries again.
      await supabase
        .from("access_emails")
        .delete()
        .eq("profile_id", row.profile_id)
        .eq("kind", row.kind)
        .eq("period_end", row.period_end);
    }
  }

  return NextResponse.json({ due: due?.length ?? 0, sent, failed });
}

export const GET = run;
export const POST = run;
