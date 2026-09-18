import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClientDetail } from "@/components/dashboard/client-detail";
import { requireOnboardedProfile } from "@/lib/auth";
import type { ActionType } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientDetailPage({
  params,
}: PageProps<"/dashboard/bookings/clients/[id]">) {
  const { id } = await params;
  const profile = await requireOnboardedProfile();

  const t = await getTranslations("dashboard.clients");

  const supabase = await createSupabaseServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!client) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, offer_title, action_type, starts_at, requested_date, quantity, status, created_at")
    .eq("client_id", client.id)
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Link
        href="/dashboard/bookings/clients"
        className="text-ink-muted hover:text-ink mb-5 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t("backToList")}
      </Link>

      <ClientDetail
        client={client}
        bookings={(bookings ?? []).map((booking) => ({
          ...booking,
          action_type: booking.action_type as ActionType,
          status: booking.status as "pending" | "confirmed" | "cancelled",
        }))}
        timezone={profile.timezone}
        locale={profile.locale}
      />
    </>
  );
}
