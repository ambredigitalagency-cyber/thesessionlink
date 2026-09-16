"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelBookingByToken } from "@/actions/public-booking";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlays";

export function ManageBookingActions({
  token,
  status,
  profileSlug,
  contactEmail,
}: {
  token: string;
  status: "pending" | "confirmed" | "cancelled";
  profileSlug: string;
  contactEmail: string | null;
}) {
  const t = useTranslations("manageBooking");
  const tError = useTranslations("errors");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (status === "cancelled") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-ink-muted text-[14px] leading-relaxed">{t("cancelledBody")}</p>
        <Button asChild variant="secondary" block>
          <a href={`/${profileSlug}`}>{t("bookAgain")}</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-ink-muted text-[14px] leading-relaxed">
        {status === "pending" ? t("pendingBody") : t("confirmedBody")}
      </p>

      <div className="flex flex-col gap-2">
        {contactEmail ? (
          <Button asChild variant="secondary" block>
            <a href={`mailto:${contactEmail}`}>{t("contactPro")}</a>
          </Button>
        ) : null}

        <Button variant="ghost" block onClick={() => setConfirmOpen(true)}>
          {t("cancelBooking")}
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        size="sm"
        title={t("cancelTitle")}
        description={t("cancelBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelBookingByToken(token);
                  if (result.ok) {
                    setConfirmOpen(false);
                    toast.success(t("cancelled"));
                    router.refresh();
                  } else {
                    toast.error(tError(result.error as "unexpected"));
                  }
                })
              }
            >
              {t("confirmCancel")}
            </Button>
          </>
        }
      />
    </div>
  );
}
