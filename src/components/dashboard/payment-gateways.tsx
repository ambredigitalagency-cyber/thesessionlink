"use client";

import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { disconnectGateway } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlays";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import type { GatewayState } from "@/lib/payments/accounts";

/**
 * The two gateway blocks in Settings.
 *
 * Connecting is a plain link, not a fetch: the coach leaves for Stripe or
 * PayPal and comes back, so the browser has to navigate. Everything secret
 * happens in the route behind that link.
 */
export function PaymentGateways({
  gateways,
  notice,
}: {
  gateways: GatewayState[];
  /** Outcome of a connection attempt, read from the URL by the page. */
  notice: string | null;
}) {
  const t = useTranslations("dashboard.payments");

  return (
    <Card className="p-5 sm:p-7">
      <CardHeader title={t("title")} description={t("subtitle")} />

      {notice ? (
        <p
          className={
            notice === "connected"
              ? "bg-success-soft text-success mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[13.5px]"
              : "bg-warning-soft text-warning mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[13.5px]"
          }
        >
          {t(`notice.${notice}` as "notice.connected")}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {gateways.map((gateway) => (
          <GatewayRow key={gateway.provider} gateway={gateway} />
        ))}
      </div>

      <p className="text-ink-subtle mt-5 text-[12.5px] leading-relaxed">{t("payoutNote")}</p>
    </Card>
  );
}

function GatewayRow({ gateway }: { gateway: GatewayState }) {
  const t = useTranslations("dashboard.payments");
  const tError = useTranslations("errors");
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, startTransition] = useTransition();

  const name = t(`providers.${gateway.provider}` as "providers.stripe");
  const Icon = gateway.provider === "stripe" ? CreditCard : Wallet;

  const tone = gateway.ready ? "success" : gateway.status === "pending" ? "warning" : undefined;
  const label = gateway.ready
    ? t("status.connected")
    : gateway.status === "pending"
      ? t("status.pending")
      : gateway.status === "disabled"
        ? t("status.disabled")
        : t("status.notConnected");

  return (
    <div className="border-line flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-ink/[0.04] text-ink mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink text-[14.5px] font-medium">{name}</p>
            {tone ? <Badge tone={tone}>{label}</Badge> : null}
          </div>
          <p className="text-ink-muted mt-0.5 text-[13px]">
            {gateway.label ?? t(`blurb.${gateway.provider}` as "blurb.stripe")}
          </p>

          {gateway.status === "connected" && !gateway.ready ? (
            <p className="text-warning mt-1.5 flex items-center gap-1.5 text-[12.5px]">
              <AlertCircle className="size-3.5 shrink-0" />
              {t("notReady")}
            </p>
          ) : null}

          {gateway.provider === "paypal" && gateway.status === "disabled" ? (
            <p className="text-ink-muted mt-1.5 text-[12.5px] leading-relaxed">
              {t("paypalManualRevoke")}{" "}
              <a
                href="https://www.paypal.com/myaccount/settings/"
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-4"
              >
                {t("paypalManualRevokeLink")}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!gateway.available ? (
          <span className="text-ink-subtle text-[12.5px]">{t("unavailable")}</span>
        ) : gateway.status === "connected" || gateway.status === "pending" ? (
          <>
            {gateway.ready ? (
              <span className="text-success hidden items-center gap-1.5 text-[12.5px] sm:flex">
                <CheckCircle2 className="size-3.5" />
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setConfirmOff(true)}>
              {t("disconnect")}
            </Button>
          </>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/payments/connect/${gateway.provider}`}>
              {t("connect")}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>

      <Modal
        open={confirmOff}
        onOpenChange={setConfirmOff}
        size="sm"
        title={t("disconnectTitle", { provider: name })}
        description={
          gateway.provider === "paypal" ? t("disconnectBodyPaypal") : t("disconnectBody")
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOff(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await disconnectGateway(gateway.provider);
                  if (result.ok) {
                    toast.success(t("disconnected", { provider: name }));
                    setConfirmOff(false);
                  } else {
                    toast.error(tError((result.error ?? "unexpected") as "unexpected"));
                  }
                })
              }
            >
              {t("disconnect")}
            </Button>
          </>
        }
      />
    </div>
  );
}
