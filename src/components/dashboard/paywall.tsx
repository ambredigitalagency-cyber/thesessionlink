import { MessageCircle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

import { DeleteAccountButton } from "@/components/dashboard/delete-account";
import { PaywallActions } from "@/components/dashboard/paywall-actions";
import type { Profile } from "@/lib/auth";
import { offlineAt, type AccessState } from "@/lib/billing/access";
import { paddleConfigured, paddleEnv } from "@/lib/billing/paddle";
import { supportAddress, supportWhatsapp } from "@/lib/env";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { TrialSummary, type TrialFigures } from "./trial-summary";

/**
 * What a locked account sees instead of its dashboard (grace or expired).
 *
 * Not a wall of red: what the page brought during the trial, said plainly from
 * the real figures; where the page stands (online until a date, or offline);
 * one button to carry on; the reassurance that cancelling is always possible
 * and nothing has been deleted. Leaving and asking for help stay within reach.
 */
export async function Paywall({
  profile,
  state,
  accountEmail,
}: {
  profile: Profile;
  state: Extract<AccessState, "grace" | "expired">;
  accountEmail: string;
}) {
  const t = await getTranslations("dashboard.paywall");
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("trial_summary", { p_profile_id: profile.id });
  const figures = (data ?? null) as TrialFigures | null;

  const offline = offlineAt(profile);
  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      timeZone: profile.timezone,
    }).format(value);
  const whatsapp = supportWhatsapp();
  const email = supportAddress();
  const configured = paddleConfigured();

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div style={rise(0)} className="rise-in flex justify-center">
        <PausedPage offline={state === "expired"} />
      </div>

      <div className="mt-8 text-center">
        <h1
          style={rise(0.05)}
          className="rise-in text-ink text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[34px]"
        >
          {state === "grace" ? t("titleGrace") : t("titleExpired")}
        </h1>
        <p
          style={rise(0.1)}
          className={`rise-in mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium ${
            state === "grace" ? "bg-success-soft text-success" : "bg-ink/5 text-ink-muted"
          }`}
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${state === "grace" ? "bg-success" : "bg-ink-subtle"}`}
          />
          {state === "grace" && offline ? t("onlineUntil", { date: date(offline) }) : t("offline")}
        </p>
      </div>

      <div style={rise(0.15)} className="rise-in mt-8">
        <TrialSummary figures={figures} />
      </div>

      <section
        id="subscribe"
        style={rise(0.2)}
        className="rise-in surface-card mt-6 p-5 sm:p-7"
        aria-labelledby="subscribe-title"
      >
        <h2 id="subscribe-title" className="text-ink text-[17px] font-semibold tracking-[-0.02em]">
          {t("planTitle", { price: PLAN_PRICE_MONTHLY })}
        </h2>
        <p className="text-ink-muted mt-1.5 text-[14px] leading-relaxed">
          {state === "grace" ? t("planBodyGrace") : t("planBodyExpired")}
        </p>
        <div className="mt-5">
          {configured ? (
            <PaywallActions
              environment={paddleEnv.environment}
              clientToken={paddleEnv.clientToken}
              locale={locale}
              price={PLAN_PRICE_MONTHLY}
              canManage={Boolean(profile.paddle_customer_id && profile.subscription_status)}
            />
          ) : (
            <p className="text-ink-muted text-[13.5px]">{t("unavailable")}</p>
          )}
        </div>
        <p className="text-ink-subtle mt-4 text-[12.5px] leading-relaxed">{t("reassurance")}</p>
      </section>

      <nav
        aria-label={t("otherActions")}
        style={rise(0.25)}
        className="rise-in mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
      >
        {whatsapp || email ? (
          <a
            href={
              whatsapp
                ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(t("supportMessage"))}`
                : `mailto:${email}`
            }
            target={whatsapp ? "_blank" : undefined}
            rel={whatsapp ? "noopener noreferrer" : undefined}
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors"
          >
            <MessageCircle className="size-4" aria-hidden />
            {t("support")}
          </a>
        ) : null}
        <DeleteAccountButton accountEmail={accountEmail} variant="ghost" />
      </nav>
    </div>
  );
}

function rise(delay: number): CSSProperties {
  return { "--rise-delay": `${delay}s` } as CSSProperties;
}

/**
 * The page in a phone, set aside: lines of a page, and a coral badge — a clock
 * while it is still online, a pause once it is not. Same family as the
 * product's other drawings; decorative.
 */
function PausedPage({ offline }: { offline: boolean }) {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden fill="none">
      <rect
        x="48"
        y="8"
        width="64"
        height="104"
        rx="14"
        className="fill-[var(--color-brand-soft)]"
        stroke="color-mix(in oklab, var(--color-brand) 30%, transparent)"
        strokeWidth="1.5"
      />
      <rect
        x="70"
        y="16"
        width="20"
        height="4"
        rx="2"
        fill="color-mix(in oklab, var(--color-brand) 30%, transparent)"
      />
      <circle
        cx="80"
        cy="40"
        r="9"
        fill="color-mix(in oklab, var(--color-brand) 30%, transparent)"
      />
      {[58, 70, 82].map((y, index) => (
        <rect
          key={y}
          x="60"
          y={y}
          width={index === 2 ? 26 : 40}
          height="7"
          rx="3.5"
          fill="color-mix(in oklab, var(--color-brand) 22%, transparent)"
        />
      ))}
      <circle cx="112" cy="88" r="17" fill="var(--color-brand)" />
      {offline ? (
        <>
          <rect x="105" y="80" width="4.5" height="16" rx="2" fill="white" />
          <rect x="114.5" y="80" width="4.5" height="16" rx="2" fill="white" />
        </>
      ) : (
        <path
          d="M112 79 v9 l6 4"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
