"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { claimWaitlistPlace } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";

/**
 * One button that turns the held place into a booking, and what happens
 * after: the booking's own page, or — when the place went, or the offer is
 * paid online — the way back to the coach's page.
 */
export function WaitlistClaim({
  token,
  status,
  profileSlug,
}: {
  token: string;
  status: "open" | "claimed" | "gone";
  profileSlug: string;
}) {
  const t = useTranslations("waitlist");
  const tError = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [booked, setBooked] = useState<{ manageToken: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (booked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className="flex size-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]"
        >
          <Check className="size-5" />
        </motion.span>
        <p className="text-ink mt-3 text-[16px] font-semibold">
          {booked.status === "confirmed" ? t("bookedConfirmed") : t("bookedPending")}
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <a href={`/booking/${booked.manageToken}`}>{t("seeBooking")}</a>
        </Button>
      </motion.div>
    );
  }

  if (status !== "open" || error) {
    const reason = error ?? (status === "claimed" ? "waitlist_claimed" : "waitlist_gone");
    return (
      <div className="space-y-4 text-center">
        <p className="text-ink-muted text-[14px] leading-relaxed">
          {tError(reason as "unexpected")}
        </p>
        {profileSlug ? (
          <Button asChild variant="secondary" size="sm">
            <a href={`/${profileSlug}`}>{t("backToPage")}</a>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="accent"
        size="lg"
        block
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimWaitlistPlace(token);
            if (result.ok && result.data) setBooked(result.data);
            else if (!result.ok) setError(result.error);
          })
        }
      >
        {t("claim")}
      </Button>
      <p className="text-ink-subtle text-center text-[12.5px]">{t("claimHint")}</p>
    </div>
  );
}
