import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { DashboardSidebarNav, DashboardTabBar } from "@/components/dashboard/nav";
import { ShareLink } from "@/components/share/share-link";
import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const supabase = await createSupabaseServerClient();
  const { count: pendingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("status", "pending");

  const publicUrl = absoluteUrl(`/${profile.slug}`, siteUrl);
  const messages = pickMessages(await getMessages(), [
    ...BASE_NAMESPACES,
    "dashboard",
    "offers",
    "media",
    "share",
    "bookingStatus",
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside className="border-line bg-surface/60 sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 flex-col border-r px-5 py-6 lg:flex">
          <Link href="/dashboard" className="px-2">
            <Logo />
          </Link>

          <div className="mt-8 flex-1">
            <DashboardSidebarNav pendingCount={pendingCount ?? 0} />
          </div>

          <div className="border-line space-y-4 border-t pt-5">
            <div>
              <p className="text-ink-subtle px-1 pb-2 text-[11px] font-medium tracking-wide uppercase">
                {t("yourLink")}
              </p>
              <ShareLink url={publicUrl} displayName={profile.display_name} size="sm" />
            </div>

            <form action={signOut} className="px-1">
              <button
                type="submit"
                className="text-ink-subtle hover:text-ink text-[12.5px] underline underline-offset-4 transition-colors"
              >
                {tCommon("logout")}
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="border-line bg-canvas/90 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-xl lg:hidden">
            <Link href="/dashboard">
              <Logo />
            </Link>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="border-line-strong text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
            >
              {tCommon("viewPage")}
              <ExternalLink className="size-3.5" />
            </a>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14">
            {children}
          </main>
        </div>

        <DashboardTabBar pendingCount={pendingCount ?? 0} />
      </div>
    </NextIntlClientProvider>
  );
}
