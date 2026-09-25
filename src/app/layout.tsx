import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";

import { siteUrl } from "@/lib/env";
import { MotionProvider } from "@/components/motion-provider";
import { BASE_NAMESPACES, pickMessages } from "@/lib/i18n/pick";
import { parseTheme, THEME_COLORS, THEME_COOKIE } from "@/lib/theme";

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

/**
 * The browser chrome follows the theme the reader actually chose.
 *
 * `colorScheme` is deliberately absent: the stylesheet already sets it on
 * :root, per theme, and that is also what `light-dark()` reads. Declaring it
 * twice, from two places, is how the two end up disagreeing.
 */
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  if (theme === "system") {
    return {
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
      ],
    };
  }

  return { themeColor: THEME_COLORS[theme] };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  // Each area adds the namespaces it renders; the root only ships the basics.
  const messages = await getMessages();
  // Read here and rendered into the very first tag: that is the whole
  // anti-flash mechanism. No inline script, nothing to run before paint.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={pickMessages(messages, BASE_NAMESPACES)}>
          <MotionProvider>{children}</MotionProvider>
        </NextIntlClientProvider>
        <Toaster
          // Sonner paints its own surface, so it needs telling; left alone it
          // would drop a white toast onto the dark page.
          theme={theme}
          position="bottom-right"
          toastOptions={{
            className: "!rounded-[var(--radius-md)] !border-line !font-sans !text-sm",
          }}
        />
      </body>
    </html>
  );
}
