import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AuditTrail } from "@/components/admin/audit-trail";
import { CoachNotes, CoachRefChip } from "@/components/admin/coach-file";
import { CoachOffersPanel, ExportMenu } from "@/components/admin/coach-insights";
import { CoachControls } from "@/components/admin/coach-controls";
import { ConsoleKpi, ConsolePanel } from "@/components/admin/console-kpi";
import { STATUS_BAR, STATUS_CHIP } from "@/components/admin/status-tone";
import { deletionDaysLeft, deletionDueAt } from "@/lib/account/deletion";
import { adminDb, requireAdmin } from "@/lib/admin/access";
import { profileCompleteness } from "@/lib/admin/coach-file";
import { parseStats } from "@/lib/tracking/stats";
import { coachRef } from "@/lib/admin/ref";
import { accountStatus, trialDaysLeft } from "@/lib/admin/status";
import { ACTION_TYPES } from "@/lib/offers/schema";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { formatPrice } from "@/lib/utils";
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
  const admin = await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin");
  // Dates and amounts follow the console's language, like its labels.
  const locale = await getLocale();

  const supabase = await adminDb(admin);
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
    .select("id, action, details, created_at, admin_user_id, via")
    .eq("target_profile_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Everything the file reads beyond the overview row, in one round trip.
  const [
    { data: profileRow },
    { data: offers },
    { data: notes },
    { data: admins },
    { data: signIns },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "avatar_url, headline, bio, location, phone_number, whatsapp_number, social_links, custom_fields, timezone, currency, locale",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("offers")
      .select("id, title, action_type, price, price_type, is_active, updated_at, position")
      .eq("profile_id", id)
      .order("position"),
    supabase
      .from("admin_notes")
      .select("id, body, created_at, author_user_id, via")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("platform_admins").select("user_id, note"),
    coach.user_id
      ? supabase
          .from("coach_sign_ins")
          .select("id, created_at, method, device, ip_prefix")
          .eq("user_id", coach.user_id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({
          data: [] as {
            id: number;
            created_at: string;
            method: string;
            device: string | null;
            ip_prefix: string | null;
          }[],
        }),
  ]);
  const { data: sessions } = coach.user_id
    ? await supabase.rpc("admin_active_sessions", { p_user_id: coach.user_id })
    : { data: [] };
  // What the page brought in over 30 days: the coach's own figures, read
  // through the same aggregation (page_stats lets admins and the service role in).
  const { data: rawStats } = await supabase.rpc("page_stats", { p_profile_id: id, p_days: 30 });
  const reach = parseStats(rawStats).totals;

  const activeOffers = (offers ?? []).filter((offer) => offer.is_active).length;
  const lastOfferEdit = (offers ?? []).reduce<string | null>(
    (latest, offer) => (!latest || offer.updated_at > latest ? offer.updated_at : latest),
    null,
  );
  const completeness = profileRow ? profileCompleteness({ ...profileRow, activeOffers }) : null;
  const adminNames = new Map((admins ?? []).map((row) => [row.user_id, row.note]));

  const timezone = profileRow?.timezone ?? "Europe/Paris";
  const currency = profileRow?.currency ?? "EUR";

  const tActions = await getTranslations("offers.actions");
  const tCommon = await getTranslations("common");
  const offerRows = (offers ?? []).map((offer) => {
    const price = formatPrice(offer.price, currency, locale, offer.price_type as "fixed");
    return {
      id: offer.id,
      title: offer.title,
      actionLabel: ACTION_TYPES.includes(offer.action_type)
        ? tActions(`${offer.action_type}.label`)
        : offer.action_type,
      priceLabel:
        price.type === "free"
          ? tCommon("free")
          : price.type === "on_request"
            ? tCommon("onRequest")
            : price.type === "from"
              ? tCommon("from", { price: price.amount ?? "" })
              : (price.amount ?? ""),
      isActive: offer.is_active,
    };
  });
  const moment = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
  const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)} %`);

  const status = accountStatus({
    trial_ends_at: coach.trial_ends_at,
    subscription_active: coach.subscription_active,
    subscription_ended_at: coach.subscription_ended_at,
    suspended_at: coach.suspended_at,
    deleted_at: coach.deleted_at,
  });

  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
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
    { label: t("coach.visits30"), value: new Intl.NumberFormat(locale).format(reach.views) },
    { label: t("coach.contacts30"), value: new Intl.NumberFormat(locale).format(reach.contacts) },
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
              <CoachRefChip value={coachRef(coach.id ?? id)} />
            </div>
            <p className="text-ink-muted mt-1.5 text-[13.5px]">{coach.contact_email ?? "—"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu coachId={coach.id ?? id} />
            <Link
              href={`/${coach.slug}`}
              target="_blank"
              className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors"
            >
              /{coach.slug}
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </div>
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
            label={t("coach.activeOffers")}
            value={String(activeOffers)}
            tone="accent"
          />
        </div>

        <ConsolePanel index={3} title={t("coach.facts")}>
          <FactList facts={facts} />
        </ConsolePanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConsolePanel index={4} title={t("activity.title")} hint={t("activity.hint")}>
          <FactList
            facts={[
              {
                label: t("activity.offers"),
                value: t("activity.offersValue", {
                  active: activeOffers,
                  total: (offers ?? []).length,
                }),
              },
              { label: t("activity.lastOfferEdit"), value: date(lastOfferEdit) },
            ]}
          />

          {completeness ? (
            <div className="border-line mt-5 border-t pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-ink-muted text-[13.5px]">{t("activity.completeness")}</p>
                <p className="text-ink text-[14px] font-semibold tabular-nums">
                  {percent(completeness.ratio)}
                </p>
              </div>
              <div
                className="bg-ink/10 mt-2 h-1.5 overflow-hidden rounded-full"
                role="img"
                aria-label={`${t("activity.completeness")} ${percent(completeness.ratio)}`}
              >
                <div
                  className="h-full rounded-full bg-[var(--console-accent)]"
                  style={{ width: `${completeness.ratio * 100}%` }}
                />
              </div>
              {completeness.missing.length > 0 ? (
                <p className="text-ink-subtle mt-2.5 text-[12.5px] leading-relaxed">
                  {t("activity.missing", {
                    items: completeness.missing
                      .map((item) => t(`activity.items.${item}`))
                      .join(", "),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </ConsolePanel>

        <ConsolePanel index={5} title={t("billing.title")} hint={t("billing.hint")}>
          <FactList
            facts={[
              {
                label: t("billing.plan"),
                value: t("billing.planValue", { price: PLAN_PRICE_MONTHLY }),
              },
              {
                label: t("billing.nextDue"),
                value: coach.subscription_active
                  ? t("billing.notWired")
                  : status === "trial"
                    ? t("billing.trialUntil", { date: date(coach.trial_ends_at) })
                    : t("billing.none"),
              },
            ]}
          />
          <p className="text-ink-subtle mt-4 text-[12px] leading-snug">{t("billing.footnote")}</p>
        </ConsolePanel>
      </div>

      <ConsolePanel
        index={6}
        title={t("intervention.offersTitle")}
        hint={t("intervention.offersHint")}
      >
        <CoachOffersPanel coachId={coach.id ?? id} offers={offerRows} />
      </ConsolePanel>

      <ConsolePanel index={6} title={t("signIns.title")} hint={t("signIns.hint")}>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-ink-muted mb-2 text-[12.5px] font-medium">{t("signIns.history")}</p>
            {(signIns ?? []).length === 0 ? (
              <p className="text-ink-subtle text-[13px]">{t("signIns.empty")}</p>
            ) : (
              <ol className="divide-line -my-1.5 divide-y">
                {(signIns ?? []).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-baseline justify-between gap-4 py-2 text-[13px]"
                  >
                    <span className="text-ink tabular-nums">
                      {moment.format(new Date(entry.created_at))}
                    </span>
                    <span className="text-ink-muted min-w-0 truncate text-right">
                      {t(`signIns.method.${entry.method as "magic_link"}`)}
                      {entry.device ? ` · ${entry.device}` : ""}
                      {entry.ip_prefix ? ` · ${entry.ip_prefix}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <p className="text-ink-muted mb-2 text-[12.5px] font-medium">{t("signIns.sessions")}</p>
            {(sessions ?? []).length === 0 ? (
              <p className="text-ink-subtle text-[13px]">{t("signIns.noSession")}</p>
            ) : (
              <ul className="space-y-2">
                {(sessions ?? []).map((session, index) => (
                  <li
                    key={index}
                    className="border-line rounded-[var(--radius-sm)] border px-3 py-2 text-[12.5px] hover:border-[var(--console-accent)]/40 motion-safe:transition-colors"
                  >
                    {/* No device here: Supabase records whoever opened the session,
                        which is this server confirming the link, not the coach's
                        browser. The real device is in the history on the left. */}
                    <p className="text-ink">
                      {t("signIns.activeSince", {
                        since: moment.format(new Date(session.created_at)),
                        last: moment.format(new Date(session.refreshed_at)),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel index={7} title={t("notes.title")} hint={t("notes.hint")}>
        <CoachNotes
          profileId={coach.id ?? id}
          notes={(notes ?? []).map((note) => ({
            id: note.id,
            body: note.body,
            created_at: note.created_at,
            // Mine: my own member notes, or — through the password door —
            // the notes left through it, the only ones it may remove.
            mine:
              admin.kind === "member"
                ? note.author_user_id === admin.userId
                : note.via === "password",
            author:
              note.via === "password"
                ? t("notes.viaPassword")
                : admin.kind === "member" && note.author_user_id === admin.userId
                  ? t("notes.you")
                  : ((note.author_user_id && adminNames.get(note.author_user_id)) ??
                    t("notes.otherAdmin")),
          }))}
        />
      </ConsolePanel>

      <ConsolePanel index={7} title={t("controls.title")} hint={t("controls.subtitle")}>
        <CoachControls
          profileId={coach.id ?? id}
          suspended={Boolean(coach.suspended_at)}
          pendingDeletion={Boolean(coach.deleted_at)}
          subscribed={Boolean(coach.subscription_active)}
          isAdminAccount={Boolean(adminRow)}
          canImpersonate={admin.kind === "member"}
        />
      </ConsolePanel>

      <ConsolePanel
        index={8}
        title={t("audit.forCoach")}
        hint={t("audit.forCoachHint")}
        className="overflow-hidden"
      >
        <AuditTrail entries={log ?? []} />
      </ConsolePanel>
    </div>
  );
}

/** Label on the left, figure on the right: every panel of the file reads this way. */
function FactList({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="divide-line -my-2.5 divide-y">
      {facts.map((fact) => (
        <div key={fact.label} className="flex items-baseline justify-between gap-6 py-2.5">
          <dt className="text-ink-muted text-[13.5px]">{fact.label}</dt>
          <dd className="text-ink text-right text-[14px] font-medium tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
