"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";

/**
 * The public page's side of the statistics: a few lines, no library, no
 * cookie, no storage.
 *
 * A visit is sent once the page has really loaded in a browser (an effect,
 * so never during server rendering, and never while a page is only being
 * prerendered). Clicks go through sendBeacon, which the browser delivers in
 * the background even as it leaves the page — a link opens exactly as fast
 * as without statistics.
 *
 * The editor's preview has no provider: nothing is sent from it.
 */

type Track = (type: "click" | "contact", blockId: string | null, kind?: ContactKind) => void;
export type ContactKind = "whatsapp" | "call" | "email" | "vcard";

const TrackingContext = createContext<Track | null>(null);

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: "text/plain" });
    if (navigator.sendBeacon?.("/api/track", blob)) return;
    void fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Statistics never break the page.
  }
}

export function TrackingProvider({
  profileId,
  children,
}: {
  profileId: string;
  children: ReactNode;
}) {
  // Read once, on the client: the ?src= of the link and where the visitor came from.
  const context = useCallback(() => {
    const src = new URL(window.location.href).searchParams.get("src");
    return { s: src, r: document.referrer || null };
  }, []);

  useEffect(() => {
    const sendView = () => send({ p: profileId, t: "view", ...context() });
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) {
      document.addEventListener("prerenderingchange", sendView, { once: true });
      return () => document.removeEventListener("prerenderingchange", sendView);
    }
    sendView();
  }, [profileId, context]);

  const track = useCallback<Track>(
    (type, blockId, kind) =>
      send({ p: profileId, t: type, b: blockId, k: kind ?? null, ...context() }),
    [profileId, context],
  );

  return <TrackingContext.Provider value={track}>{children}</TrackingContext.Provider>;
}

const noop: Track = () => {};

/** Sends an event, or does nothing outside a public page (the preview). */
export function useTrack(): Track {
  return useContext(TrackingContext) ?? noop;
}

/** The page's ?src= and referrer, for the request forms to pass along. */
export function pageOrigin(): { src: string | null; referrer: string | null } {
  if (typeof window === "undefined") return { src: null, referrer: null };
  return {
    src: new URL(window.location.href).searchParams.get("src"),
    referrer: document.referrer || null,
  };
}
