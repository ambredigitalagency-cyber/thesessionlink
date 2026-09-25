import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { requireAdmin } from "@/lib/admin/access";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

/**
 * The platform console.
 *
 * Deliberately not built like the coach dashboard: dark chrome, no sidebar, no
 * accent colour. Whoever lands here must know within a glance that they are not
 * in a coach's account.
 *
 * The guard runs in the layout, so every page below inherits it, and answers a
 * 404 to anyone who is not an admin.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const t = await getTranslations("admin");
  const messages = pickMessages(await getMessages(), [...BASE_NAMESPACES, "admin"]);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="bg-canvas min-h-dvh">
        {/* A bar that is dark in both themes, so its text is light in both:
            `ink` would have turned it white under a dark theme and taken the
            white links with it. */}
        <header className="bg-night text-on-night sticky top-0 z-40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4" />
              {t("title")}
            </Link>

            <nav className="flex items-center gap-4 text-[13.5px]">
              <Link href="/admin" className="text-white/70 transition-colors hover:text-white">
                {t("nav.coaches")}
              </Link>
              <Link
                href="/admin/audit"
                className="text-white/70 transition-colors hover:text-white"
              >
                {t("nav.audit")}
              </Link>
              <Link href="/dashboard" className="text-white/70 transition-colors hover:text-white">
                {t("nav.myDashboard")}
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-3 text-[12.5px] text-white/60">
              <span className="hidden sm:inline">{user.email}</span>
              <form action={signOut}>
                <button type="submit" className="transition-colors hover:text-white">
                  {t("nav.signOut")}
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
