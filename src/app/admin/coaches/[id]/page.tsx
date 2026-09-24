import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuditTrail } from "@/components/admin/audit-trail";
import { CoachControls } from "@/components/admin/coach-controls";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { deletionDaysLeft, deletionDueAt } from "@/lib/account/deletion";
import { requireAdmin } from "@/lib/admin/access";
import { accountStatus, trialDaysLeft } from "@/lib/admin/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCoachPage({ params }: PageProps<"/admin/coaches/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin");

  const supabase = await createSupabaseServerClient();
  const { data: coach } = await supabase
    .from("admin_coach_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!coach) notFound();

  // An admin account cannot be moderated; the console says so instead of
  // offering a button the server would refuse.
  const { data: adminRow } = coach.user_id
    ? await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", coach.user_id)
        .maybeSingle()
    : { data: null };

  const { data: log } = await supabase
    .from("admin_audit_log")
    .select("id, action, details, created_at, admin_user_id")
    .eq("target_profile_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const status = accountStatus({
    trial_ends_at: coach.trial_ends_at,
    subscription_active: coach.subscription_active,
    suspended_at: coach.suspended_at,
    deleted_at: coach.deleted_at,
  });

  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(
          new Date(value),
        )
      : "—";

  const facts = [
    { label: t("coach.signedUp"), value: date(coach.created_at) },
    {
      label: t("coach.trialEnds"),
      value: `${date(coach.trial_ends_at)}${
        status === "trial"
          ? ` · ${t("coach.daysLeft", { count: trialDaysLeft({ trial_ends_at: coach.trial_ends_at, subscription_active: coach.subscription_active, suspended_at: coach.suspended_at }) })}`
          : ""
      }`,
    },
    {
      label: t("coach.subscription"),
      value: coach.subscription_active ? t("coach.subscriptionOn") : t("coach.subscriptionOff"),
    },
    { label: t("coach.offers"), value: String(coach.offers_count ?? 0) },
    { label: t("coach.bookings"), value: String(coach.bookings_count ?? 0) },
    { label: t("coach.lastBooking"), value: date(coach.last_booking_at) },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t("coach.back")}
      </Link>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-ink text-[22px] font-semibold tracking-[-0.02em]">
                {coach.display_name}
              </h1>
              <Badge
                tone={
                  status === "subscribed"
                    ? "success"
                    : status === "trial"
                      ? "accent"
                      : status === "suspended" || status === "deleted"
                        ? "danger"
                        : "warning"
                }
              >
                {t(`status.${status}`)}
              </Badge>
            </div>
            <p className="text-ink-muted mt-1 text-[13.5px]">{coach.contact_email ?? "—"}</p>
          </div>

          <Link
            href={`/${coach.slug}`}
            target="_blank"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] underline underline-offset-4"
          >
            /{coach.slug}
            <ExternalLink className="size-3.5" />
          </Link>
        </div>

        {coach.deleted_at ? (
          <p className="bg-danger-soft text-danger mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
            {t("coach.deletionRequested", {
              date: date(coach.deleted_at),
              due: date(deletionDueAt(coach.deleted_at).toISOString()),
              count: deletionDaysLeft(coach.deleted_at),
            })}
          </p>
        ) : null}

        {coach.suspended_at ? (
          <p className="bg-danger-soft text-danger mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
            {t("coach.suspendedSince", {
              date: date(coach.suspended_at),
              reason: coach.suspension_reason ?? "—",
            })}
          </p>
        ) : null}

        <dl className="divide-line border-line mt-5 divide-y border-y">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-6 py-2.5">
              <dt className="text-ink-muted text-[13.5px]">{fact.label}</dt>
              <dd className="text-ink text-right text-[14px] font-medium tabular-nums">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("controls.title")} description={t("controls.subtitle")} />
        <div className="mt-5">
          <CoachControls
            profileId={coach.id ?? id}
            suspended={Boolean(coach.suspended_at)}
            pendingDeletion={Boolean(coach.deleted_at)}
            subscribed={Boolean(coach.subscription_active)}
            isAdminAccount={Boolean(adminRow)}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("audit.forCoach")} description={t("audit.forCoachHint")} />
        <div className="mt-5">
          <AuditTrail entries={log ?? []} />
        </div>
      </Card>
    </div>
  );
}
