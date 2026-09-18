import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      messages={pickMessages(messages, [...BASE_NAMESPACES, "landing", "offers.actions"])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
