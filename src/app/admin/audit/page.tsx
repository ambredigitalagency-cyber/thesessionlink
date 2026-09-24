import { getTranslations } from "next-intl/server";

import { AuditTrail, type AuditEntry } from "@/components/admin/audit-trail";
import { Card } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminAuditPage() {
  await requireAdmin();
  const t = await getTranslations("admin");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, action, details, created_at, admin_user_id, target:profiles(id, display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">
          {t("audit.title")}
        </h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("audit.subtitle")}</p>
      </div>

      <Card className="p-5 sm:p-6">
        <AuditTrail entries={(data ?? []) as AuditEntry[]} showTarget />
      </Card>
    </div>
  );
}
