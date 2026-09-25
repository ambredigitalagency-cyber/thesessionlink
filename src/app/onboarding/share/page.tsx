import { ArrowRight, Mail, MessageCircle } from "lucide-react";

import { SocialIcon } from "@/components/brand/social-icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Celebration } from "@/components/onboarding/celebration";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { ShareLink } from "@/components/share/share-link";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";

export default async function OnboardingSharePage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding/profile");
  if (!profile.onboarding_completed_at) redirect("/onboarding/offer");

  const t = await getTranslations("onboarding.share");
  const url = absoluteUrl(`/${profile.slug}`, siteUrl);

  const places = [
    {
      key: "instagram" as const,
      icon: () => <SocialIcon name="instagram" className="text-ink-muted size-4" />,
    },
    { key: "signature" as const, icon: () => <Mail className="text-ink-muted size-4" /> },
    { key: "messages" as const, icon: () => <MessageCircle className="text-ink-muted size-4" /> },
  ];

  return (
    <>
      <OnboardingSteps current={4} />

      <div className="bg-success-soft text-success mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
        <span className="bg-success size-1.5 rounded-full" />
        {t("badge")}
      </div>

      <h1 className="text-ink text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[38px]">
        {t.rich("title", {
          accent: (chunks) => <span className="display-accent">{chunks}</span>,
        })}
      </h1>
      <p className="text-ink-muted mt-3 max-w-lg text-[16px] leading-relaxed">{t("subtitle")}</p>

      <Celebration>
        <div className="surface-card mt-8 p-5 sm:p-7">
          <ShareLink url={url} displayName={profile.display_name} />
        </div>
      </Celebration>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {places.map(({ icon: Icon, key }) => (
          <div key={key} className="border-line bg-surface rounded-[var(--radius-md)] border p-4">
            <Icon />
            <p className="text-ink mt-2.5 text-[13.5px] font-medium">{t(`places.${key}.title`)}</p>
            <p className="text-ink-muted mt-1 text-[12.5px] leading-relaxed">
              {t(`places.${key}.body`)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/dashboard">
            {t("toDashboard")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={url} target="_blank" rel="noreferrer">
            {t("viewPage")}
          </a>
        </Button>
      </div>
    </>
  );
}
