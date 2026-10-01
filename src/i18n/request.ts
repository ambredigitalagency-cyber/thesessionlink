import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, URL_LOCALE_HEADER, isLocale } from "@/lib/i18n/config";

/**
 * We deliberately do not use locale-prefixed routes: public profiles live at
 * `/[slug]` and that URL is the product. The locale comes from a cookie, set by
 * the language switcher (and by the pro's settings when they sign in).
 *
 * An explicit `locale` (e.g. `getTranslations({ locale })` when rendering a
 * public profile in the pro's language) always wins over the cookie. So does
 * the language a route's URL fixes (the legal pages), which the proxy passes
 * in a request header.
 */
export default getRequestConfig(async ({ locale: requested }) => {
  let locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  if (!isLocale(requested)) {
    try {
      const urlLocale = (await headers()).get(URL_LOCALE_HEADER);
      const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
      if (isLocale(urlLocale)) locale = urlLocale;
      else if (isLocale(cookieLocale)) locale = cookieLocale;
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
