import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuditTrail } from "@/components/admin/audit-trail";
import { CoachControls } from "@/components/admin/coach-controls";
import { ConsoleKpi, ConsolePanel } from "@/components/admin/console-kpi";
import { STATUS_BAR, STATUS_CHIP } from "@/components/admin/status-tone";
import { deletionDaysLeft, deletionDueAt } from "@/lib/account/deletion";
import { requireAdmin } from "@/lib/admin/access";
import { accountStatus, trialDaysLeft } from "@/lib/admin/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * One coach: everything the console knows, and everything it can do.
 *
 * The page is read in three passes and is now built that way. Who is this and
 * what state are they in — the identity band, with the status in the colour the
 * list already used, so a row and the page it opens agree. What have they done
 * — two figures and the dates. What can be done about it — the interventions,
 * and then the trace of every intervention already taken.
 *
 * `CoachControls` is untouched on purpose: it holds every server action on this
 * page, and this rebuild is a presentation job.
 */
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
    { label: t("coach.lastBooking"), value: date(coach.last_booking_at) },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin"
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("coach.back")}
      </Link>

      {/* The identity band. The status bar runs down the left edge, in the same
          colour the list used for this coach's row. */}
      <section className="rise-in border-line bg-surface relative overflow-hidden rounded-[var(--radius-lg)] border p-5 sm:p-7">
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", STATUS_BAR[status])} />

        <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-ink text-[24px] leading-tight font-semibold tracking-[-0.03em]">
                {coach.display_name}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                  STATUS_CHIP[status],
                )}
              >
                {t(`status.${status}`)}
              </span>
            </div>
            <p className="text-ink-muted mt-1.5 text-[13.5px]">{coach.contact_email ?? "—"}</p>
          </div>

          <Link
            href={`/${coach.slug}`}
            target="_blank"
            className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors"
          >
            /{coach.slug}
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>

        {coach.deleted_at ? (
          <p className="bg-danger-soft text-danger mt-5 ml-2 rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
            {t("coach.deletionRequested", {
              date: date(coach.deleted_at),
              due: date(deletionDueAt(coach.deleted_at).toISOString()),
              count: deletionDaysLeft(coach.deleted_at),
            })}
          </p>
        ) : null}

        {coach.suspended_at ? (
          <p className="bg-danger-soft text-danger mt-5 ml-2 rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
            {t("coach.suspendedSince", {
              date: date(coach.suspended_at),
              reason: coach.suspension_reason ?? "—",
            })}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        {/* Stacked on a wide screen so the two figures fill the height of the
            facts beside them instead of floating in half-empty cards. */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <ConsoleKpi index={1} label={t("coach.offers")} value={String(coach.offers_count ?? 0)} />
          <ConsoleKpi
            index={2}
            label={t("coach.bookings")}
            value={String(coach.bookings_count ?? 0)}
            tone="accent"
          />
        </div>

        <ConsolePanel index={3} title={t("coach.facts")}>
          <dl className="divide-line -my-2.5 divide-y">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-6 py-2.5">
                <dt className="text-ink-muted text-[13.5px]">{fact.label}</dt>
                <dd className="text-ink text-right text-[14px] font-medium tabular-nums">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </ConsolePanel>
      </div>

      <ConsolePanel index={4} title={t("controls.title")} hint={t("controls.subtitle")}>
        <CoachControls
          profileId={coach.id ?? id}
          suspended={Boolean(coach.suspended_at)}
          pendingDeletion={Boolean(coach.deleted_at)}
          subscribed={Boolean(coach.subscription_active)}
          isAdminAccount={Boolean(adminRow)}
        />
      </ConsolePanel>

      <ConsolePanel
        index={5}
        title={t("audit.forCoach")}
        hint={t("audit.forCoachHint")}
        className="overflow-hidden"
      >
        <AuditTrail entries={log ?? []} />
      </ConsolePanel>
    </div>
  );
}
