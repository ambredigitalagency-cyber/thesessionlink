import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/brand/logo";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { safeNextPath } from "@/lib/safe-redirect";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const intent = params.intent === "signup" ? "signup" : "login";
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const linkError = params.error === "invalid_link";
  const t = await getTranslations("auth");
  const messages = pickMessages(await getMessages(), [...BASE_NAMESPACES, "auth"]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-60" />

      <div className="relative w-full max-w-[26rem]">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="TheSessionLink">
            <Logo />
          </Link>
        </div>

        <div className="surface-card p-7 sm:p-8">
          {intent === "signup" ? (
            <p className="bg-ink/5 text-ink-muted mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium">
              <span className="size-1.5 rounded-full bg-[var(--accent)]" />
              Step 1 of 4
            </p>
          ) : null}

          <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">
            {intent === "signup" ? t("signupTitle") : t("loginTitle")}
          </h1>
          <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
            {intent === "signup" ? t("signupSubtitle") : t("loginSubtitle")}
          </p>

          <NextIntlClientProvider messages={messages}>
            <AuthForm intent={intent} next={next} linkError={linkError} />
          </NextIntlClientProvider>
        </div>

        <p className="text-ink-muted mt-6 text-center text-[13px]">
          {intent === "signup" ? (
            <Link href="/login" className="hover:text-ink underline underline-offset-4">
              {t("switchToLogin")}
            </Link>
          ) : (
            <Link
              href="/login?intent=signup"
              className="hover:text-ink underline underline-offset-4"
            >
              {t("switchToSignup")}
            </Link>
          )}
        </p>
      </div>
    </main>
  );
}
