import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

/**
 * We deliberately do not use locale-prefixed routes: public profiles live at
 * `/[slug]` and that URL is the product. The locale comes from a cookie, set by
 * the language switcher (and by the pro's settings when they sign in).
 *
 * An explicit `locale` (e.g. `getTranslations({ locale })` when rendering a
 * public profile in the pro's language) always wins over the cookie.
 */
export default getRequestConfig(async ({ locale: requested }) => {
  let locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  if (!isLocale(requested)) {
    try {
      const store = await cookies();
      const cookieLocale = store.get(LOCALE_COOKIE)?.value;
      if (isLocale(cookieLocale)) locale = cookieLocale;
    } catch {
      // No request scope (e.g. background job): stay on the default locale.
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Date/time output always passes an explicit timeZone.
    timeZone: "UTC",
  };
});
