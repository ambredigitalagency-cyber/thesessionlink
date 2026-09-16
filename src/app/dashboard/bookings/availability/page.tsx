import { getTranslations } from "next-intl/server";

import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { WeeklyScheduleEditor } from "@/components/dashboard/weekly-schedule";
import { Card, CardHeader } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AvailabilityPage() {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.availability");

  const supabase = await createSupabaseServerClient();
  const [{ data: rules }, { data: timeOff }, { data: overrides }] = await Promise.all([
    supabase
      .from("availabilities")
      .select("offer_id, weekday, start_time, end_time")
      .eq("profile_id", profile.id)
      .is("offer_id", null),
    supabase
      .from("time_off")
      .select("id, starts_on, ends_on, label")
      .eq("profile_id", profile.id)
      .order("starts_on"),
    supabase
      .from("availabilities")
      .select("offer_id, offers(title)")
      .eq("profile_id", profile.id)
      .not("offer_id", "is", null),
  ]);

  const overriddenOffers = Array.from(
    new Map(
      (overrides ?? [])
        .filter((row) => row.offers)
        .map((row) => [row.offer_id, (row.offers as { title: string }).title]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-7">
        <CardHeader
          title={t("weeklyTitle")}
          description={t("weeklyHint", { timezone: profile.timezone })}
        />
        <div className="mt-5">
          <WeeklyScheduleEditor
            offerId={null}
            rules={(rules ?? []).map((rule) => ({ ...rule, offer_id: null }))}
            locale={profile.locale}
          />
        </div>

        {overriddenOffers.length > 0 ? (
          <p className="bg-ink/[0.03] text-ink-muted mt-4 rounded-[var(--radius-md)] p-3.5 text-[13px] leading-relaxed">
            {t("overridesNote", { offers: overriddenOffers.join(", ") })}
          </p>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("timeOffTitle")} description={t("timeOffHint")} />
        <div className="mt-5">
          <TimeOffManager entries={timeOff ?? []} locale={profile.locale} />
        </div>
      </Card>
    </div>
  );
}
