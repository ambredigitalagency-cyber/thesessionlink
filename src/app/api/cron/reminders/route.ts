import { NextResponse, type NextRequest } from "next/server";

import { sendBookingReminder } from "@/lib/emails/send";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends session reminders. Triggered by pg_cron (every 10 min, see
 * supabase/migrations/…_reminders_cron.sql) and by Vercel Cron as a fallback.
 *
 * claim_due_reminders() stamps the rows it returns, so concurrent runs never
 * send twice; a failed send is rolled back so the next run retries it.
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  const provided = request.headers.get("authorization");

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: bookings, error } = await supabase.rpc("claim_due_reminders", { p_limit: 50 });

  if (error) {
    console.error("[cron] claim failed", error);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const booking of bookings ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", booking.profile_id)
      .single();

    if (!profile) continue;

    const result = await sendBookingReminder({ booking, profile });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      // Release the claim so the next run retries this reminder.
      await supabase.from("bookings").update({ reminder_sent_at: null }).eq("id", booking.id);
    }
  }

  return NextResponse.json({ claimed: bookings?.length ?? 0, sent, failed });
}
