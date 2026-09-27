import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { ConsoleLoginForm } from "@/components/admin/console-login-form";
import { currentAdmin } from "@/lib/admin/access";
import { passwordAccessEnabled } from "@/lib/admin/password-access";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/**
 * The console password screen — solo/demo access, see
 * lib/admin/password-access.ts.
 *
 * It lives outside the (console) route group so the console guard never runs
 * here. Without ADMIN_ACCESS_PASSWORD it does not exist (404); someone who is
 * already in — by either door — goes straight to the console.
 */
export default async function ConsoleLoginPage() {
  if (!passwordAccessEnabled()) notFound();
  if (await currentAdmin()) redirect("/admin");

  const t = await getTranslations("admin");
  const messages = pickMessages(await getMessages(), [...BASE_NAMESPACES, "admin.access"]);

  return (
    <NextIntlClientProvider messages={messages}>
      <main
        data-console
        className="flex min-h-dvh items-center justify-center bg-[var(--console-rail)] px-4 py-16 text-[var(--console-rail-ink)]"
      >
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--console-accent)]/20 text-[var(--console-accent)]">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">{t("title")}</h1>
            <p className="mt-1.5 text-[13.5px] text-[var(--console-rail-muted)]">
              {t("access.subtitle")}
            </p>
          </div>

          <ConsoleLoginForm />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
