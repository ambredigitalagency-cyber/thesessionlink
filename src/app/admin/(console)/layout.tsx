import { LogOut } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { leaveConsole } from "@/actions/admin-access";
import { signOut } from "@/actions/auth";
import { ConsoleRail, ConsoleRailFooter } from "@/components/admin/console-rail";
import { requireAdmin } from "@/lib/admin/access";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";

/**
 * The platform console.
 *
 * Deliberately not built like the coach dashboard. That one has a light
 * sidebar and the coach's own neutral palette; this has a rail that stays dark
 * in both themes and a steel accent that appears nowhere else in the product.
 * Whoever lands here must know within a glance that they are not in a coach's
 * account — and, just as importantly, must not mistake a coach's data for
 * their own.
 *
 * `data-console` scopes that identity: the tokens it switches on are declared
 * under that attribute, so none of it can leak into a page rendered elsewhere.
 *
 * The guard runs in the layout, so every page below inherits it. It lets in a
 * platform admin or the holder of the console password (solo/demo use), sends
 * a visitor with no session to /admin/login, and answers a 404 to a signed-in
 * coach who is neither. /admin/login sits outside this route group, so it
 * never runs this guard.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const actor = await requireAdmin();
  const t = await getTranslations("admin");
  const messages = pickMessages(await getMessages(), [
    ...BASE_NAMESPACES,
    "admin",
    "bookingStatus",
  ]);

  // The password door has no Supabase session to end: leaving it removes the
  // console cookie. A member signs out of their account, as before.
  const identity = actor.kind === "member" ? actor.email : t("access.passwordIdentity");
  const signOutButton = (
    <form action={actor.kind === "member" ? signOut : leaveConsole}>
      <button
        type="submit"
        className="hover:text-ink inline-flex items-center gap-1.5 transition-colors"
      >
        <LogOut className="size-3.5" aria-hidden />
        {t("nav.signOut")}
      </button>
    </form>
  );

  return (
    <NextIntlClientProvider messages={messages}>
      <div data-console className="bg-canvas flex min-h-dvh flex-col lg:flex-row">
        <ConsoleRail identity={identity} showDashboard={actor.kind === "member"} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-6xl justify-end px-4 pt-4 sm:px-6 lg:px-9">
            <PreferenceToggles tone="steel" />
          </div>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-3 pb-7 sm:px-6 sm:pb-9 lg:px-9">
            {children}
          </main>

          <ConsoleRailFooter
            identity={identity}
            showDashboard={actor.kind === "member"}
            signOut={signOutButton}
          />

          {/* On desktop the rail already carries the identity and the account,
              so the content column only needs the way out. */}
          <div className="border-line text-ink-subtle hidden border-t px-4 py-4 text-[12px] sm:px-6 lg:block lg:px-9">
            {signOutButton}
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
