import { getTranslations } from "next-intl/server";

import { StatsView } from "@/components/dashboard/stats-view";
import { requireOnboardedProfile } from "@/lib/auth";
import {
  computeStats,
  isStatsRange,
  rangeStart,
  type StatsBooking,
  type StatsOffer,
} from "@/lib/stats/compute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("stats") };
}

/** Rows older than this are never needed by the "all" range either. */
const MAX_ROWS = 2000;

export default async function StatsPage({ searchParams }: PageProps<"/dashboard/stats">) {
  const profile = await requireOnboardedProfile();
  const query = await searchParams;
  const range = isStatsRange(query.range) ? query.range : "30d";

  // One reference instant for the whole request: the buckets, the fill rate and
  // the range all have to agree on "now".
  const now = new Date();
  // "all" needs everything; the bounded ranges only need their own window, plus
  // the sessions held inside it whatever day they were booked.
  const since = range === "all" ? null : rangeStart(range, now, null);

  const supabase = await createSupabaseServerClient();

  const bookingsQuery = supabase
    .from("bookings")
    .select(
      "offer_id, offer_title, status, no_show, quantity, starts_at, ends_at, created_at, payment_status, payment_amount_cents, payment_currency",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  const [{ data: bookings }, { data: offers }, { data: windows }, { data: timeOff }] =
    await Promise.all([
      since
        ? bookingsQuery.or(
            `created_at.gte.${since.toISOString()},starts_at.gte.${since.toISOString()}`,
          )
        : bookingsQuery,
      supabase.from("offers").select("id, title, price, price_type").eq("profile_id", profile.id),
      supabase
        .from("availabilities")
        .select("weekday, start_time, end_time")
        .eq("profile_id", profile.id),
      supabase.from("time_off").select("starts_on, ends_on").eq("profile_id", profile.id),
    ]);

  const stats = computeStats({
    bookings: (bookings ?? []) as StatsBooking[],
    offers: (offers ?? []) as StatsOffer[],
    offerTitles: new Map((offers ?? []).map((offer) => [offer.id, offer.title])),
    windows: windows ?? [],
    timeOff: timeOff ?? [],
    timezone: profile.timezone,
    range,
    now,
  });

  return (
    <StatsView
      stats={stats}
      range={range}
      currency={profile.currency}
      locale={profile.locale}
      timezone={profile.timezone}
      hasBookings={(bookings ?? []).length > 0}
    />
  );
}
