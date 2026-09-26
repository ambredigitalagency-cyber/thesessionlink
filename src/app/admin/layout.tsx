import { LogOut } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { signOut } from "@/actions/auth";
import { ConsoleRail, ConsoleRailFooter } from "@/components/admin/console-rail";
import { requireAdmin } from "@/lib/admin/access";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

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
 * The guard runs in the layout, so every page below inherits it, and answers a
 * 404 to anyone who is not an admin.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const t = await getTranslations("admin");
  const messages = pickMessages(await getMessages(), [...BASE_NAMESPACES, "admin"]);

  const signOutButton = (
    <form action={signOut}>
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
        <ConsoleRail email={user.email ?? ""} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-9">
            {children}
          </main>

          <ConsoleRailFooter email={user.email ?? ""} signOut={signOutButton} />

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
