"use client";

import { Download, Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

/**
 * The richer half of a coach's file in the console: the offers an admin can
 * step into, and the data export.
 */

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

export type AdminOfferRow = {
  id: string;
  title: string;
  actionLabel: string;
  priceLabel: string;
  isActive: boolean;
};

export function CoachOffersPanel({
  coachId,
  offers,
}: {
  coachId: string;
  offers: AdminOfferRow[];
}) {
  const t = useTranslations("admin.intervention");

  if (offers.length === 0) return <p className="text-ink-subtle text-[13px]">{t("noOffers")}</p>;

  return (
    <ul className="divide-line -my-2 divide-y">
      {offers.map((offer) => (
        <li key={offer.id} className="group flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[14px] font-medium",
                offer.isActive ? "text-ink" : "text-ink-subtle",
              )}
            >
              {offer.title}
            </p>
            <p className="text-ink-subtle mt-0.5 text-[12.5px]">
              {offer.actionLabel} · {offer.priceLabel}
              {offer.isActive ? null : ` · ${t("hidden")}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={`/admin/coaches/${coachId}/offers/${offer.id}`}>
              <Pencil className="size-3.5" aria-hidden />
              {t("editOffer")}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

export function ExportMenu({ coachId }: { coachId: string }) {
  const t = useTranslations("admin.export");
  const base = `/admin/coaches/${coachId}/export`;
  const items = [
    { href: `${base}?format=json`, label: t("json") },
    { href: `${base}?format=csv&kind=offers`, label: t("csvOffers") },
  ];

  return (
    <Menu>
      <MenuTrigger className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors">
        <Download className="size-3.5" aria-hidden />
        {t("title")}
      </MenuTrigger>
      <MenuContent align="end">
        {items.map((item) => (
          <MenuItem key={item.href} asChild>
            <a href={item.href} download>
              {item.label}
            </a>
          </MenuItem>
        ))}
        <p className="text-ink-subtle max-w-60 px-3 pt-1 pb-2 text-[11.5px] leading-snug">
          {t("note")}
        </p>
      </MenuContent>
    </Menu>
  );
}
