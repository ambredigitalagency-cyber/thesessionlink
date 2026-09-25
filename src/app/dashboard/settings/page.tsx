import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { PaymentGateways } from "@/components/dashboard/payment-gateways";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireOnboardedProfile, requireUser } from "@/lib/auth";
import { gatewayStates } from "@/lib/payments/accounts";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("settings") };
}

const NOTICES = ["connected", "pending", "declined", "not_configured", "error"];

export default async function SettingsPage({ searchParams }: PageProps<"/dashboard/settings">) {
  const user = await requireUser();
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.settings");

  const query = await searchParams;
  const raw = Array.isArray(query.payments) ? query.payments[0] : query.payments;
  const notice = typeof raw === "string" && NOTICES.includes(raw) ? raw : null;
  const gateways = await gatewayStates(profile.id);
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <>
      <header className="mb-7">
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
      </header>

      <SettingsForm
        profile={profile}
        accountEmail={user.email ?? ""}
        theme={theme}
        payments={<PaymentGateways gateways={gateways} notice={notice} />}
      />
    </>
  );
}
