import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-50" />

      <div className="relative max-w-md">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>

        <h1 className="text-ink mt-8 text-[30px] font-semibold tracking-[-0.035em]">
          {t("title")}
        </h1>
        <p className="text-ink-muted mt-3 text-[15.5px] leading-relaxed">{t("body")}</p>

        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login?intent=signup">
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
