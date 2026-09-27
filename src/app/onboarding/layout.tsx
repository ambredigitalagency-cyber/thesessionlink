import { LogOut } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  await requireUser();
  const t = await getTranslations("common");
  const messages = pickMessages(await getMessages(), [
    ...BASE_NAMESPACES,
    "onboarding",
    "offers",
    "publicProfile.gallery",
    "media",
    "share",
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_60%)] opacity-50" />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <PreferenceToggles tone="paper" />
          <form action={signOut}>
            <button
              type="submit"
              aria-label={t("logout")}
              title={t("logout")}
              className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] transition-colors"
            >
              <LogOut className="size-4 sm:hidden" aria-hidden />
              <span className="hidden underline underline-offset-4 sm:inline">{t("logout")}</span>
            </button>
          </form>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-5 pt-4 pb-20 sm:px-8">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </main>
    </div>
  );
}
