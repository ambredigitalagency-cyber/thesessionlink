import { getTranslations } from "next-intl/server";

import { AuditTrail, type AuditEntry } from "@/components/admin/audit-trail";
import { ConsolePanel } from "@/components/admin/console-kpi";
import { ConsoleHeader } from "@/components/admin/console-header";
import { adminDb, requireAdmin } from "@/lib/admin/access";

export default async function AdminAuditPage() {
  const actor = await requireAdmin();
  const t = await getTranslations("admin");

  const supabase = await adminDb(actor);
  const { data } = await supabase
    .from("admin_audit_log")
    .select(
      "id, action, details, created_at, admin_user_id, via, target:profiles(id, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const entries = (data ?? []) as AuditEntry[];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow={t("nav.audit")}
        title={t("audit.title")}
        subtitle={t("audit.subtitle")}
      />

      <ConsolePanel
        title={t("audit.entries", { count: entries.length })}
        hint={t("audit.latest")}
        className="overflow-hidden"
      >
        <AuditTrail entries={entries} showTarget />
      </ConsolePanel>
    </div>
  );
}
