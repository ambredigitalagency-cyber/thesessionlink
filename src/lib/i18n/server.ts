import { createTranslator } from "next-intl";

import { DEFAULT_LOCALE, type Locale } from "./config";

type Messages = Record<string, unknown>;

const cache = new Map<Locale, Messages>();

async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = cache.get(locale);
  if (cached) return cached;

  const messages = (await import(`../../../messages/${locale}.json`)).default as Messages;
  cache.set(locale, messages);
  return messages;
}

/**
 * Translator usable outside a request scope (emails, cron jobs), where the
 * locale comes from the data (booking / profile) rather than from a cookie.
 *
 * Email copy is addressed with computed keys (`confirmed.subject` /
 * `pending.subject`), so this translator is intentionally string-keyed.
 * `npm test` checks that every key used here exists in both locales.
 */
export type LooseTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export async function getTranslator(
  locale: Locale = DEFAULT_LOCALE,
  namespace?: string,
): Promise<LooseTranslator> {
  const messages = await loadMessages(locale);
  const translator = createTranslator({
    locale,
    messages: messages as never,
    namespace: namespace as never,
  });
  return translator as unknown as LooseTranslator;
}
