import { getTranslations } from "next-intl/server";

import { BookingsTabs } from "@/components/dashboard/bookings-tabs";

export default async function BookingsLayout({ children }: LayoutProps<"/dashboard/bookings">) {
  const t = await getTranslations("dashboard.bookings");

  return (
    <>
      <header className="mb-6">
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
      </header>

      <BookingsTabs />

      <div className="mt-6">{children}</div>
    </>
  );
}
