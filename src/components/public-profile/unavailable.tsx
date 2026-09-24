import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";

/**
 * What a visitor sees when the link is real but the professional is gone.
 *
 * Deliberately says nothing about why. A suspended account and one the coach
 * asked to delete get the same sentence, so the page never discloses which —
 * that is between the coach and us.
 */
export async function ProfileUnavailable({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "publicProfile.unavailable" });

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-50" />

      <div className="relative max-w-md">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>

        <h1 className="text-ink mt-8 text-[26px] leading-snug font-semibold tracking-[-0.03em]">
          {t("title")}
        </h1>

        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button asChild variant="secondary" size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
