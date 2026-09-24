"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { stopImpersonating } from "@/actions/admin";

/**
 * Shown on every screen while an admin is looking through a coach's account.
 *
 * Loud on purpose, and sticky: forgetting you are impersonating is how support
 * sessions turn into accidents. It also states that the session is read-only,
 * because the database will refuse writes and a silent failure would be worse
 * than a warning.
 */
export function ImpersonationBanner({ coachName }: { coachName: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-warning text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[13px] sm:px-6">
        <span className="inline-flex items-center gap-2 font-medium">
          <Eye className="size-4" />
          {t("banner.title", { name: coachName })}
        </span>
        <span className="text-white/80">{t("banner.readOnly")}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await stopImpersonating();
              router.push("/admin");
              router.refresh();
            })
          }
          className="ml-auto rounded-full bg-white/15 px-3 py-1 font-medium transition-colors hover:bg-white/25 disabled:opacity-60"
        >
          {t("banner.stop")}
        </button>
      </div>
    </div>
  );
}
