import { BookingsCalendar, type CalendarBooking } from "@/components/dashboard/bookings-calendar";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BookingsCalendarPage() {
  const profile = await requireOnboardedProfile();
  const supabase = await createSupabaseServerClient();

  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  const to = new Date();
  to.setMonth(to.getMonth() + 12);

  const [{ data: bookings }, { data: timeOff }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, offer_title, client_name, starts_at, ends_at, requested_date, status, action_type",
      )
      .eq("profile_id", profile.id)
      .neq("status", "cancelled")
      .or(
        `starts_at.gte.${from.toISOString()},requested_date.gte.${from.toISOString().slice(0, 10)}`,
      )
      .limit(1000),
    supabase
      .from("time_off")
      .select("id, starts_on, ends_on, label")
      .eq("profile_id", profile.id)
      .gte("ends_on", from.toISOString().slice(0, 10)),
  ]);

  return (
    <BookingsCalendar
      bookings={(bookings ?? []) as CalendarBooking[]}
      timeOff={timeOff ?? []}
      timezone={profile.timezone}
      locale={profile.locale}
    />
  );
}
