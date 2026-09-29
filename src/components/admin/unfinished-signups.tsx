import { Mail } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ConsolePanel } from "./console-kpi";

export type UnfinishedSignup = {
  user_id: string;
  email: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
};

/**
 * Accounts that exist but have no profile yet: they confirmed their email or
 * signed in with Google, then stopped before choosing a name and a link. They
 * are not coaches in the console's sense — nothing public, nothing to act on —
 * so they get their own short list instead of empty rows in the coach table.
 */
export async function UnfinishedSignups({
  signups,
  index,
}: {
  signups: UnfinishedSignup[];
  index?: number;
}) {
  if (signups.length === 0) return null;
  const t = await getTranslations("admin.unfinished");
  const tag = (await getLocale()) === "fr" ? "fr-FR" : "en-US";
  const date = (value: string) =>
    new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(value),
    );

  return (
    <ConsolePanel index={index} title={t("title", { count: signups.length })} hint={t("hint")}>
      <ul className="divide-line divide-y">
        {signups.map((signup) => (
          <li
            key={signup.user_id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
          >
            <Mail className="text-ink-subtle size-4 shrink-0" aria-hidden />
            <span className="text-ink min-w-0 flex-1 truncate text-[14px] font-medium">
              {signup.email ?? t("noEmail")}
            </span>
            <span className="rounded-full bg-[var(--console-accent-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--console-accent-ink)]">
              {signup.provider === "google" ? "Google" : t("emailProvider")}
            </span>
            <span className="text-ink-muted text-[12.5px] tabular-nums">
              {t("createdOn", { date: date(signup.created_at) })}
              {" · "}
              {signup.last_sign_in_at
                ? t("lastSeen", { date: date(signup.last_sign_in_at) })
                : t("neverSignedIn")}
            </span>
          </li>
        ))}
      </ul>
    </ConsolePanel>
  );
}
