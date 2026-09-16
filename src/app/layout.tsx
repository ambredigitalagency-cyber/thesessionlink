import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";

import { siteUrl } from "@/lib/env";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const displaySerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s · TheSessionLink` },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: "TheSessionLink",
      title: t("title"),
      description: t("description"),
      url: siteUrl,
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbfaf9",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  // Each area adds the namespaces it renders; the root only ships the basics.
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={pickMessages(messages, BASE_NAMESPACES)}>
          {children}
        </NextIntlClientProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "!rounded-[var(--radius-md)] !border-line !font-sans !text-sm",
          }}
        />
      </body>
    </html>
  );
}
