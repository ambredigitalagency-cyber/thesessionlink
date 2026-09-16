import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PLAN_PRICES, UPGRADE_PATH, type PlanType } from "@/lib/plans/config";

/**
 * Shown in place of a feature the current plan does not include. A locked
 * feature always says which plan unlocks it and what it costs — never a blank
 * screen or a silent redirect.
 */
export async function PlanUpsell({
  feature,
  currentPlan,
}: {
  feature: "crm" | "reminders" | "offers" | "photos";
  currentPlan: PlanType;
}) {
  const t = await getTranslations("plans");
  const target = UPGRADE_PATH[currentPlan] ?? "premium";

  return (
    <div className="surface-card flex flex-col items-center px-6 py-12 text-center">
      <span className="bg-ink/5 text-ink-muted flex size-11 items-center justify-center rounded-full">
        <Lock className="size-5" />
      </span>

      <h2 className="text-ink mt-4 text-[19px] font-semibold tracking-[-0.02em]">
        {t(`locked.${feature}.title` as "locked.crm.title")}
      </h2>
      <p className="text-ink-muted mt-2 max-w-sm text-[14.5px] leading-relaxed">
        {t(`locked.${feature}.body` as "locked.crm.body")}
      </p>

      <Button asChild size="md" className="mt-6">
        <Link href="/#pricing">
          {t("upgradeTo", { plan: t(`names.${target}` as "names.base") })}
        </Link>
      </Button>

      <p className="text-ink-subtle mt-3 text-[12.5px]">
        {t("fromPerMonth", { price: PLAN_PRICES[target].monthly })}
      </p>
    </div>
  );
}
