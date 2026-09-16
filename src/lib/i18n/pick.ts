type Messages = Record<string, unknown>;

/**
 * Keeps only the namespaces a part of the app actually renders.
 *
 * Without this, every page ships the whole dictionary to the browser — the
 * public profile would carry the dashboard copy for nothing.
 * Paths can be nested: "offers.actions".
 */
export function pickMessages(messages: Messages, paths: string[]): Messages {
  const result: Messages = {};

  for (const path of paths) {
    const segments = path.split(".");
    let source: unknown = messages;
    let target = result;

    for (let index = 0; index < segments.length; index += 1) {
      const key = segments[index];
      source = (source as Messages | undefined)?.[key];
      if (source === undefined) break;

      if (index === segments.length - 1) {
        target[key] = source;
      } else {
        target[key] = (target[key] as Messages) ?? {};
        target = target[key] as Messages;
      }
    }
  }

  return result;
}

/** Copy every screen needs: shared labels, error messages, error boundaries. */
export const BASE_NAMESPACES = ["common", "errors", "errorPage"];
