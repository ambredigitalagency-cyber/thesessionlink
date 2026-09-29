"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { openBillingPortal, startSubscriptionCheckout } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

/**
 * Opens Paddle's checkout over the page (Paddle.js overlay).
 *
 * Paddle.js is fetched on the first click, not on page load: every dashboard
 * page can show this button, and none of them should pay for a payment
 * library until someone actually decides to pay.
 *
 * The transaction is prepared by our server (startSubscriptionCheckout), which
 * binds it to the coach's profile; the browser only receives its id. Paddle
 * then tells us the result through the signed webhook — the success callback
 * here only refreshes the page, it never marks anything paid.
 */

type PaddleGlobal = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: {
    token: string;
    eventCallback?: (event: { name?: string }) => void;
  }) => void;
  Checkout: {
    open: (options: {
      transactionId: string;
      settings?: { displayMode?: "overlay"; locale?: string; theme?: "light" | "dark" };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let loading: Promise<PaddleGlobal> | null = null;

function loadPaddle(environment: "sandbox" | "production", token: string, onCompleted: () => void) {
  loading ??= new Promise<PaddleGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      const paddle = window.Paddle;
      if (!paddle) return reject(new Error("paddle_missing"));
      // Sandbox must be declared before Initialize; production is the default.
      if (environment === "sandbox") paddle.Environment.set("sandbox");
      paddle.Initialize({
        token,
        eventCallback: (event) => {
          if (event.name === "checkout.completed") onCompleted();
        },
      });
      resolve(paddle);
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("paddle_unreachable"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function SubscribeButton({
  environment,
  clientToken,
  locale,
  label,
  size = "md",
}: {
  environment: "sandbox" | "production";
  clientToken: string;
  locale: string;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const t = useTranslations("dashboard.billing");
  const tError = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function subscribe() {
    startTransition(async () => {
      const result = await startSubscriptionCheckout();
      if (!result.ok) {
        notify.error(
          result.error === "billing_unavailable"
            ? t("unavailable")
            : tError((result.error ?? "unexpected") as "unexpected"),
        );
        return;
      }
      if (!result.data) {
        notify.error(t("unavailable"));
        return;
      }
      const { transactionId } = result.data;
      try {
        const paddle = await loadPaddle(environment, clientToken, () => {
          notify.success(t("thanks"));
          // The webhook flips the status; give it a moment, then show it.
          setTimeout(() => router.refresh(), 2500);
        });
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: "overlay",
            locale,
            theme: "light",
          },
        });
      } catch {
        notify.error(t("unavailable"));
      }
    });
  }

  return (
    <Button onClick={subscribe} loading={pending} size={size}>
      {label}
      <ArrowRight className="size-4" />
    </Button>
  );
}

export function ManageBillingButton({ label }: { label: string }) {
  const t = useTranslations("dashboard.billing");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await openBillingPortal();
          if (result.ok && result.data) window.open(result.data.url, "_blank", "noopener");
          else notify.error(t("unavailable"));
        })
      }
    >
      {label}
    </Button>
  );
}
