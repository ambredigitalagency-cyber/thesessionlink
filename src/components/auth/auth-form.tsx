"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { requestMagicLink } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

export function AuthForm({
  intent,
  next,
  linkError,
}: {
  intent: "login" | "signup";
  next: string;
  linkError?: boolean;
}) {
  const t = useTranslations("auth");
  const tError = useTranslations("errors");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "invalid_link" : null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestMagicLink({ email, next, locale });
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
            <MailCheck className="size-5" />
          </div>
          <p className="text-ink mt-4 text-[17px] font-medium">{t("sentTitle")}</p>
          <p className="text-ink-muted mt-1.5 text-[14px] leading-relaxed">
            {t("sentBody", { email })}
          </p>
          <p className="text-ink-muted mt-5 text-[13px]">
            {t("sentHint")}{" "}
            <button
              type="button"
              className="hover:text-ink underline underline-offset-4"
              onClick={() => {
                setSent(false);
              }}
            >
              {t("sentRetry")}
            </button>
            .
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={submit}
          className="mt-7 space-y-4"
          noValidate
        >
          <Field
            label={t("emailLabel")}
            error={
              error
                ? error === "invalid_link"
                  ? t("invalidLink")
                  : tError(error as "unexpected")
                : null
            }
          >
            <Input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" block loading={pending} disabled={!email}>
            {intent === "signup" ? t("submitSignup") : t("submitLogin")}
            <ArrowRight className="size-4" />
          </Button>

          {intent === "signup" ? (
            <p className="text-ink-subtle text-center text-[12px]">
              {t("trialNote", { price: PLAN_PRICE_MONTHLY })}
            </p>
          ) : null}

          <p className="text-ink-subtle pt-1 text-center text-[11px] leading-relaxed">
            {t("terms")}
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
