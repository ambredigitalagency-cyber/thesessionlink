"use client";

import { CalendarPlus, LogIn, RotateCcw, ShieldBan, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  extendTrial,
  impersonate,
  restoreAccount,
  setSubscription,
  suspendProfile,
  unsuspendProfile,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlays";

const EXTENSIONS = [7, 14, 30, 90];

/**
 * The interventions the console allows on one account. Every one of them ends
 * up in the audit log, which is why suspending asks for a reason and a
 * commercial gesture can carry one.
 */
export function CoachControls({
  profileId,
  suspended,
  pendingDeletion,
  subscribed,
  isAdminAccount,
}: {
  profileId: string;
  suspended: boolean;
  /** The coach asked to leave and the purge has not run yet. */
  pendingDeletion: boolean;
  subscribed: boolean;
  /** Platform admins are out of reach of moderation, including yourself. */
  isAdminAccount: boolean;
}) {
  const t = useTranslations("admin");
  const tError = useTranslations("errors");
  const router = useRouter();

  const [days, setDays] = useState(14);
  const [reason, setReason] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await work();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(tError((result.error ?? "unexpected") as "unexpected"));
      }
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("controls.extendLabel")} className="w-40">
          <NativeSelect
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {EXTENSIONS.map((option) => (
              <option key={option} value={option}>
                {t("controls.days", { count: option })}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant="secondary"
          onClick={() => run(() => extendTrial(profileId, days), t("controls.extended"))}
          loading={pending}
        >
          <CalendarPlus className="size-4" />
          {t("controls.extend")}
        </Button>
      </div>

      <div className="border-line flex flex-wrap items-center gap-3 border-t pt-5">
        <Button
          variant={subscribed ? "ghost" : "primary"}
          onClick={() =>
            run(
              () => setSubscription(profileId, !subscribed, reason),
              subscribed ? t("controls.subscriptionOff") : t("controls.subscriptionOn"),
            )
          }
          loading={pending}
        >
          {subscribed ? t("controls.markUnpaid") : t("controls.markPaid")}
        </Button>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("controls.reasonPlaceholder")}
          maxLength={500}
          className="sm:max-w-sm"
          aria-label={t("controls.reasonLabel")}
        />
      </div>

      <div className="border-line flex flex-wrap items-center gap-3 border-t pt-5">
        <Button
          variant="secondary"
          onClick={() => run(() => impersonate(profileId), t("controls.impersonating"))}
          loading={pending}
        >
          <LogIn className="size-4" />
          {t("controls.impersonate")}
        </Button>
        <p className="text-ink-subtle text-[12.5px]">{t("controls.impersonateHint")}</p>
      </div>

      <div className="border-line flex flex-wrap items-center gap-3 border-t pt-5">
        {isAdminAccount && !suspended ? (
          <p className="bg-ink/[0.03] text-ink-muted rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
            {t("controls.adminProtected")}
          </p>
        ) : suspended ? (
          <Button
            variant="secondary"
            onClick={() => run(() => unsuspendProfile(profileId), t("controls.unsuspended"))}
            loading={pending}
          >
            <ShieldCheck className="size-4" />
            {t("controls.unsuspend")}
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirmSuspend(true)}>
            <ShieldBan className="size-4" />
            {t("controls.suspend")}
          </Button>
        )}
        {isAdminAccount && !suspended ? null : (
          <p className="text-ink-subtle text-[12.5px]">{t("controls.suspendHint")}</p>
        )}
      </div>

      {pendingDeletion ? (
        <div className="border-line flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            variant="secondary"
            onClick={() => run(() => restoreAccount(profileId), t("controls.restored"))}
            loading={pending}
          >
            <RotateCcw className="size-4" />
            {t("controls.restore")}
          </Button>
          <p className="text-ink-subtle text-[12.5px]">{t("controls.restoreHint")}</p>
        </div>
      ) : null}

      <Modal
        open={confirmSuspend}
        onOpenChange={setConfirmSuspend}
        title={t("controls.suspendTitle")}
        description={t("controls.suspendBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSuspend(false)}>
              {t("controls.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                run(async () => {
                  const result = await suspendProfile(profileId, reason);
                  if (result.ok) setConfirmSuspend(false);
                  return result;
                }, t("controls.suspended"))
              }
            >
              {t("controls.suspend")}
            </Button>
          </>
        }
      >
        <Field label={t("controls.reasonLabel")} hint={t("controls.reasonHint")}>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            autoFocus
          />
        </Field>
      </Modal>
    </div>
  );
}
