import { LifeBuoy } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

/**
 * Where a suspended coach lands. Their data is untouched; the tools are not
 * available while the account is suspended, and the reason the admin recorded
 * is shown so they know what to answer.
 */
export default async function SuspendedPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) redirect("/onboarding");
  if (!profile.suspended_at) redirect("/dashboard");

  const t = await getTranslations("admin.suspended");
  const contact = serverEnv.emailReplyTo || serverEnv.emailFrom;

  return (
    <main className="bg-canvas flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <Logo />
      <div className="surface-card mt-8 max-w-md p-7 text-center">
        <span className="bg-warning-soft text-warning mx-auto flex size-11 items-center justify-center rounded-full">
          <LifeBuoy className="size-5" />
        </span>
        <h1 className="text-ink mt-4 text-[20px] font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <p className="text-ink-muted mt-2 text-[14.5px] leading-relaxed">{t("body")}</p>

        {profile.suspension_reason ? (
          <p className="bg-ink/[0.03] text-ink mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-left text-[13.5px]">
            {t("reason", { reason: profile.suspension_reason })}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {contact ? (
            <Button asChild size="md">
              <a href={`mailto:${contact}`}>{t("contact")}</a>
            </Button>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="md">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
