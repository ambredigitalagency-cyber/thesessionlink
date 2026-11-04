"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { deleteAccount } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlays";
import { DELETION_GRACE_DAYS } from "@/lib/account/deletion";
import { notify } from "@/lib/notify";

/**
 * "Delete my account": the button and its confirmation, where the coach types
 * their email address. Settings › Danger zone, and the subscription screen of
 * a locked account — leaving is always possible.
 */
export function DeleteAccountButton({
  accountEmail,
  variant = "danger",
}: {
  accountEmail: string;
  variant?: "danger" | "ghost";
}) {
  const t = useTranslations("dashboard.settings");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {t("deleteAccount")}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title={t("deleteTitle")}
        description={t("deleteBody", { count: DELETION_GRACE_DAYS })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={confirmation.trim().toLowerCase() !== accountEmail.toLowerCase()}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAccount(confirmation);
                  if (result && !result.ok) notify.error(tError(result.error as "unexpected"));
                })
              }
            >
              {t("deleteConfirm")}
            </Button>
          </>
        }
      >
        <Field label={t("deleteConfirmLabel", { email: accountEmail })}>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={accountEmail}
            autoComplete="off"
          />
        </Field>
      </Modal>
    </>
  );
}
