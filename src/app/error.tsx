"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>

      <h1 className="text-ink mt-8 text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
      <p className="text-ink-muted mt-2.5 max-w-sm text-[15px] leading-relaxed">{t("body")}</p>

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={reset} size="lg">
          <RotateCcw className="size-4" />
          {t("retry")}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="text-ink-subtle mt-6 font-mono text-[11px]">{error.digest}</p>
      ) : null}
    </main>
  );
}
