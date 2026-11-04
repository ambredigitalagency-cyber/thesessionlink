"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { currentAccessState } from "@/actions/billing";
import { ManageBillingButton, SubscribeButton } from "@/components/dashboard/subscribe-button";

const POLL_MS = 2000;
const GIVE_UP_MS = 90_000;

/**
 * Subscribe, then wait for Paddle's word. The payment confirms in the browser
 * at once, but the account only opens when the signed webhook has switched
 * it on — usually a few seconds. Meanwhile the screen says so, asks the server
 * every two seconds, and opens the dashboard the moment it is unlocked. If it
 * takes unusually long, it says that too, rather than spinning forever.
 */
export function PaywallActions({
  environment,
  clientToken,
  locale,
  price,
  canManage,
}: {
  environment: "sandbox" | "production";
  clientToken: string;
  locale: string;
  price: number;
  canManage: boolean;
}) {
  const t = useTranslations("dashboard.paywall");
  const tBilling = useTranslations("dashboard.billing");
  const router = useRouter();
  const [waiting, setWaiting] = useState<"no" | "yes" | "slow">("no");

  useEffect(() => {
    if (waiting === "no") return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const state = await currentAccessState().catch(() => null);
      if (state === "subscribed" || state === "trial") {
        clearInterval(timer);
        router.refresh();
      } else if (Date.now() - started > GIVE_UP_MS) {
        setWaiting("slow");
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {waiting === "no" ? (
        <motion.div
          key="actions"
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex flex-wrap items-center gap-3"
        >
          <SubscribeButton
            environment={environment}
            clientToken={clientToken}
            locale={locale}
            label={tBilling("subscribe", { price })}
            size="lg"
            onCompleted={() => setWaiting("yes")}
          />
          {canManage ? <ManageBillingButton label={tBilling("manage")} /> : null}
        </motion.div>
      ) : (
        <motion.div
          key="waiting"
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-success-soft flex items-start gap-3 rounded-[var(--radius-md)] p-4"
        >
          <Loader2 className="text-success mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
          <div>
            <p className="text-ink text-[14.5px] font-medium">{t("waitingTitle")}</p>
            <p className="text-ink-muted mt-0.5 text-[13.5px] leading-relaxed">
              {waiting === "slow" ? t("waitingSlow") : t("waitingBody")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
