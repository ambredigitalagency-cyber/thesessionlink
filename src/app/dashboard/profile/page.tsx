import { getTranslations } from "next-intl/server";

import { ProfileEditor } from "@/components/dashboard/profile-editor";
import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("profile") };
}

export default async function DashboardProfilePage() {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.profile");

  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("activity_categories")
    .select("id, slug, name, icon")
    .eq("is_active", true)
    .order("position");

  return (
    <>
      <header className="mb-7">
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
      </header>

      <ProfileEditor
        profile={profile}
        categories={categories ?? []}
        linkBase={siteUrl.replace(/^https?:\/\//, "")}
        publicUrl={absoluteUrl(`/${profile.slug}`, siteUrl)}
      />
    </>
  );
}
