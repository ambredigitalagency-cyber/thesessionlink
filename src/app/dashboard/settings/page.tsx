import { getTranslations } from "next-intl/server";

import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireOnboardedProfile, requireUser } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.settings");

  return (
    <>
      <header className="mb-7">
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
      </header>

      <SettingsForm profile={profile} accountEmail={user.email ?? ""} />
    </>
  );
}
