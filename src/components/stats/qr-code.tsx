"use client";

import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ThemeId } from "@/lib/page/themes";
import { qrColors } from "@/lib/tracking/qr";
import { cn } from "@/lib/utils";

const NO_SUBSCRIPTION = () => () => {};

/**
 * A QR code of a link, in the page's colours when they scan reliably and in
 * black on white when they do not, with its downloads: a print-resolution PNG
 * (2048 px), an SVG, and a print layout — the code, the name, "Scan to
 * contact me". Generated in the browser; nothing is sent anywhere.
 *
 * Shared by "My tracking links" (one code per source) and the sign-up's final
 * screen (the page's own link).
 */
export function QrCodePanel({
  url,
  filename,
  displayName,
  accent,
  theme,
  size = 220,
  actions = ["png", "svg", "print"],
  className,
}: {
  url: string;
  filename: string;
  displayName: string;
  accent: string;
  theme: ThemeId;
  size?: number;
  actions?: readonly ("png" | "svg" | "print")[];
  className?: string;
}) {
  const t = useTranslations("stats.links");
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fg, bg, branded } = qrColors(accent, theme);
  // The print sheet is portalled into <body>: only once mounted, so the
  // server's HTML and the first client render agree.
  const mounted = useSyncExternalStore(
    NO_SUBSCRIPTION,
    () => true,
    () => false,
  );

  function save(href: string, extension: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = `${filename}.${extension}`;
    link.click();
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (canvas) save(canvas.toDataURL("image/png"), "png");
  }

  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], {
      type: "image/svg+xml",
    });
    const href = URL.createObjectURL(blob);
    save(href, "svg");
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  return (
    <div className={cn("space-y-5", className)}>
      <figure className="flex flex-col items-center gap-3">
        <div className="border-line rounded-[var(--radius-md)] border bg-white p-4">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={size}
            level="Q"
            marginSize={2}
            fgColor={fg}
            bgColor={bg}
            title={t("qrAlt", { url })}
          />
        </div>
        <figcaption className="text-ink-muted max-w-xs text-center font-mono text-[12px] break-all">
          {url}
        </figcaption>
      </figure>
      {/* The print-resolution PNG is drawn off screen. */}
      <QRCodeCanvas
        ref={canvasRef}
        value={url}
        size={2048}
        level="Q"
        marginSize={4}
        fgColor={fg}
        bgColor={bg}
        className="hidden"
      />
      <p
        className={cn("text-[12.5px] leading-relaxed", branded ? "text-ink-muted" : "text-warning")}
      >
        {branded ? t("branded") : t("fallback")}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.includes("png") ? (
          <Button type="button" onClick={downloadPng}>
            <Download className="size-4" aria-hidden />
            {t("png")}
          </Button>
        ) : null}
        {actions.includes("svg") ? (
          <Button type="button" variant="secondary" onClick={downloadSvg}>
            <Download className="size-4" aria-hidden />
            {t("svg")}
          </Button>
        ) : null}
        {actions.includes("print") ? (
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("print")}
          </Button>
        ) : null}
      </div>
      {actions.includes("print") && mounted
        ? createPortal(
            <div className="print-sheet" aria-hidden>
              <QRCodeSVG
                value={url}
                size={420}
                level="Q"
                marginSize={4}
                fgColor={fg}
                bgColor={bg}
              />
              <p className="print-name">{displayName}</p>
              <p className="print-cta">{t("printCta")}</p>
              <p className="print-url">{url.replace(/^https?:\/\//, "")}</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
