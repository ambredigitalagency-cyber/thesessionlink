import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Logo } from "@/components/brand/logo";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { FirstOfferPrompt } from "@/components/dashboard/first-offer-prompt";
import { DashboardSidebarNav, DashboardTabBar } from "@/components/dashboard/nav";
import { ShareLink } from "@/components/share/share-link";
import { getImpersonatedProfile, requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const profile = await requireOnboardedProfile();
  const impersonated = await getImpersonatedProfile();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const supabase = await createSupabaseServerClient();
  const [{ count: pendingCount }, { count: liveOffers }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("status", "pending"),
    // Published offers only: a coach whose offers are all paused shows the
    // same "being set up" public page as one who has none.
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("is_active", true),
  ]);

  const publicUrl = absoluteUrl(`/${profile.slug}`, siteUrl);
  const messages = pickMessages(await getMessages(), [
    ...BASE_NAMESPACES,
    "dashboard",
    "offers",
    "publicProfile.gallery",
    "media",
    "share",
    "bookingStatus",
    // Only shipped while an admin is looking through this account.
    ...(impersonated ? ["admin.banner"] : []),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      {impersonated ? <ImpersonationBanner coachName={impersonated.display_name} /> : null}
      <CommandPalette />
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
            <Link href="/dashboard" className="shrink-0">
              <Logo className="text-[15px]" />
            </Link>
            <div className="flex items-center gap-2">
              <PreferenceToggles tone="paper" />
              {/* Icon only on a phone: the toggles need the room. */}
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={tCommon("viewPage")}
                title={tCommon("viewPage")}
                className="border-line-strong text-ink inline-flex size-8 items-center justify-center rounded-full border sm:w-auto sm:gap-1.5 sm:px-3"
              >
                <span className="hidden text-[12.5px] font-medium sm:inline">
                  {tCommon("viewPage")}
                </span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </header>

          <div className="mx-auto hidden w-full max-w-5xl justify-end px-10 pt-5 lg:flex">
            <PreferenceToggles tone="paper" />
          </div>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-4 lg:pb-14">
            {liveOffers === 0 ? <FirstOfferPrompt publicUrl={publicUrl} /> : null}
            {children}
          </main>
        </div>

        <DashboardTabBar pendingCount={pendingCount ?? 0} />
      </div>
    </NextIntlClientProvider>
  );
}
