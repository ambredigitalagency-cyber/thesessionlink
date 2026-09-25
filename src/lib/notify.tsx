"use client";

import { AlertTriangle, Check, Info } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

/**
 * The one way this product raises a toast.
 *
 * Calls were spread across forty-odd `toast.success` / `toast.error` sites,
 * each styled by whatever sonner defaults happened to apply. That left two
 * problems worth fixing in one place: nothing told the eye which kind of
 * message had arrived before reading it, and a toast could never carry the
 * obvious next step — "created" with no way to go and look at the thing.
 *
 * So: an icon that says what kind of news this is, and an optional action.
 * Everything else — position, duration, the surface itself — stays sonner's,
 * configured once on the Toaster.
 */

type Kind = "success" | "error" | "info";

export type NotifyOptions = {
  description?: ReactNode;
  /** A single next step, shown as a button inside the toast. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds. Errors stay longer by default; an action longer still. */
  duration?: number;
};

const ICONS: Record<Kind, ReactNode> = {
  success: <Check className="size-4" />,
  error: <AlertTriangle className="size-4" />,
  info: <Info className="size-4" />,
};

const TONES: Record<Kind, string> = {
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
  info: "bg-ink/[0.06] text-ink-muted",
};

/** Long enough to read, and longer when there is something to click. */
function defaultDuration(kind: Kind, hasAction: boolean): number {
  if (hasAction) return 8000;
  return kind === "error" ? 6000 : 4000;
}

function raise(kind: Kind, message: ReactNode, options: NotifyOptions = {}) {
  const { description, action, duration } = options;

  return toast.custom(
    (id) => (
      <div className="border-line bg-surface flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-3.5 shadow-[var(--shadow-float)]">
        <span
          aria-hidden
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${TONES[kind]}`}
        >
          {ICONS[kind]}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-ink text-[14px] leading-snug font-medium">{message}</p>
          {description ? (
            <p className="text-ink-muted mt-1 text-[13px] leading-relaxed">{description}</p>
          ) : null}

          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                toast.dismiss(id);
              }}
              className="text-ink hover:text-ink-muted mt-2 text-[13px] font-medium underline underline-offset-4 transition-colors"
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    ),
    { duration: duration ?? defaultDuration(kind, Boolean(action)) },
  );
}

export const notify = {
  success: (message: ReactNode, options?: NotifyOptions) => raise("success", message, options),
  error: (message: ReactNode, options?: NotifyOptions) => raise("error", message, options),
  info: (message: ReactNode, options?: NotifyOptions) => raise("info", message, options),
  dismiss: toast.dismiss,
};
