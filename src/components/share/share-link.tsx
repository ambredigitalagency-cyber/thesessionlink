"use client";

import { Check, Copy, Link2, Mail, QrCode, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlays";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

/** The copy-and-share block used on the onboarding final screen and the dashboard. */
export function ShareLink({
  url,
  displayName,
  className,
  size = "md",
}: {
  url: string;
  displayName: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const pretty = url.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error(t("copyFailed"));
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: displayName,
          text: t("shareText", { name: displayName }),
          url,
        });
        return;
      } catch {
        // dismissed
      }
    }
    await copy();
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "border-line-strong bg-surface flex items-center gap-2 rounded-full border p-1.5 pl-4",
          size === "sm" && "pl-3",
        )}
      >
        <Link2 className="text-ink-subtle size-4 shrink-0" />
        <span
          className={cn(
            "text-ink min-w-0 flex-1 truncate font-medium",
            size === "md" ? "text-[15px]" : "text-[13px]",
          )}
        >
          {pretty}
        </span>
        <Button
          type="button"
          size={size === "md" ? "md" : "sm"}
          onClick={copy}
          className="shrink-0"
        >
          <motion.span
            key={copied ? "copied" : "copy"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </motion.span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={nativeShare}>
          <Share2 className="size-3.5" />
          {t("share")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
          <QrCode className="size-3.5" />
          {t("qr")}
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${t("shareText", { name: displayName })} ${url}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a
            href={`mailto:?subject=${encodeURIComponent(displayName)}&body=${encodeURIComponent(`${t("shareText", { name: displayName })}\n${url}`)}`}
          >
            <Mail className="size-3.5" />
            {t("email")}
          </a>
        </Button>
      </div>

      <Modal
        open={qrOpen}
        onOpenChange={setQrOpen}
        title={t("qrTitle")}
        description={pretty}
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="border-line rounded-[var(--radius-md)] border bg-white p-5">
            <QRCodeSVG value={url} size={200} level="M" marginSize={0} />
          </div>
          <p className="text-ink-muted text-center text-[13px]">{t("qrHint")}</p>
        </div>
      </Modal>
    </div>
  );
}
