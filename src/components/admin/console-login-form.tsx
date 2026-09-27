"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { enterConsole } from "@/actions/admin-access";

/**
 * The console password field. The value goes to the server action and nowhere
 * else — no storage, no logging — and is cleared after a refusal so it does
 * not sit in the DOM.
 */
export function ConsoleLoginForm() {
  const t = useTranslations("admin.access");
  const tError = useTranslations("errors");
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) return;

    startTransition(async () => {
      const result = await enterConsole(password);
      if (result.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      setPassword("");
      setError(tError((result.error ?? "unexpected") as "unexpected"));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label htmlFor={id} className="sr-only">
        {t("password")}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(null);
        }}
        placeholder={t("password")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--console-rail-line)] bg-[var(--console-rail-soft)] px-4 text-[15px] text-[var(--console-rail-ink)] transition-colors placeholder:text-[var(--console-rail-muted)] focus:border-[var(--console-accent)] focus:outline-none aria-[invalid=true]:border-red-400/70"
      />

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !password}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--console-accent)] text-[15px] font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("submit")}
        {pending ? null : <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
