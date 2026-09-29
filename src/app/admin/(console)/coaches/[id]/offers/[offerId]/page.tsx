import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { adminUpdateOffer } from "@/actions/admin";
import { AdminOfferEditor } from "@/components/admin/admin-offer-editor";
import { adminDb, requireAdmin } from "@/lib/admin/access";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { parseAddons } from "@/lib/offers/addons";
import { parseOfferFields } from "@/lib/offers/fields";
import { parseCategoryConfig } from "@/lib/offers/schema";

/**
 * Editing a coach's offer from the console. An intervention: the page says so
 * before anything else, and the save is journaled with the fields changed.
 */
export default async function AdminOfferPage({
  params,
}: {
  params: Promise<{ id: string; offerId: string }>;
}) {
  const actor = await requireAdmin();
  const { id, offerId } = await params;
  const t = await getTranslations("admin.intervention");
  const supabase = await adminDb(actor);

  const [{ data: offer }, { data: coach }, { data: gateways }] = await Promise.all([
    supabase.from("offers").select("*").eq("id", offerId).eq("profile_id", id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, display_name, currency, locale, whatsapp_number, category_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("payment_accounts").select("status, charges_enabled").eq("profile_id", id),
  ]);
  if (!offer || !coach) notFound();

  const { data: category } = coach.category_id
    ? await supabase
        .from("activity_categories")
        .select("config")
        .eq("id", coach.category_id)
        .maybeSingle()
    : { data: null };

  // The offer editor needs its own dictionary on top of the console's.
  const messages = pickMessages(await getMessages(), [
    ...BASE_NAMESPACES,
    "admin",
    "offers",
    "media",
    "publicProfile.gallery",
  ]);

  return (
    <div className="space-y-5">
      <Link
        href={`/admin/coaches/${id}`}
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {coach.display_name}
      </Link>

      <div
        role="note"
        className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-4"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
        <div>
          <p className="text-ink text-[14px] font-semibold">{t("title")}</p>
          <p className="text-ink-muted mt-0.5 text-[13px] leading-relaxed">
            {t("offerBody", { coach: coach.display_name })}
          </p>
        </div>
      </div>

      <div className="surface-card p-5 sm:p-7">
        <h1 className="text-ink mb-6 text-[22px] font-semibold tracking-[-0.02em]">
          {offer.title}
        </h1>
        <NextIntlClientProvider messages={messages}>
          <AdminOfferEditor
            coachId={id}
            save={adminUpdateOffer.bind(null, offer.id)}
            categoryFields={parseCategoryConfig(category?.config).suggested_fields}
            currency={coach.currency}
            locale={coach.locale}
            profileWhatsapp={coach.whatsapp_number}
            gatewayReady={(gateways ?? []).some(
              (row) => row.status === "connected" && row.charges_enabled,
            )}
            initial={{
              id: offer.id,
              title: offer.title,
              description: offer.description,
              price: offer.price,
              price_type: offer.price_type as "fixed" | "from" | "free" | "on_request",
              photos: (offer.photos as string[] | null) ?? [],
              action_type: offer.action_type,
              action_config: offer.action_config,
              custom_fields: parseOfferFields(offer.custom_fields),
              addons: parseAddons(offer.addons),
              is_active: offer.is_active,
            }}
          />
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
