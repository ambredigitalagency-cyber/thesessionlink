"use client";

import { createContext, useContext, type ReactNode } from "react";

import { isExternal, safeUrl } from "@/lib/page/urls";

import { useTrack, type ContactKind } from "./tracking";

/**
 * Every link and call-to-action on a public page goes through here.
 *
 * It knows which block it belongs to (`data-block`) and what kind of action it
 * is (`data-action`), and sends that to the page statistics as a click or a
 * contact (see ./tracking) without ever waiting for it. It also:
 *
 *   * refuses any href that is not http(s), mailto or tel — a javascript: or
 *     data: URL renders as plain text, never as a link;
 *   * opens external links in a new tab with rel="noopener noreferrer";
 *   * in the editor's preview, keeps the page from navigating away.
 */

export type TrackedAction =
  | "link"
  | "social"
  | "whatsapp"
  | "call"
  | "email"
  | "service"
  | "video"
  | "map"
  | "file"
  | "announcement"
  | "vcard";

/** Which actions reach the coach (a contact) rather than lead somewhere (a click). */
const CONTACTS: Partial<Record<TrackedAction, ContactKind>> = {
  whatsapp: "whatsapp",
  call: "call",
  email: "email",
  vcard: "vcard",
};

/** The beacon for an action: never awaited, so it never delays the link. */
function useActionTracker(blockId: string, action: TrackedAction) {
  const track = useTrack();
  return () => {
    const kind = CONTACTS[action];
    if (kind) track("contact", blockId, kind);
    else track("click", blockId);
  };
}

/** True inside the editor's preview: nothing navigates, nothing opens. */
export const PreviewContext = createContext(false);

export function usePreview() {
  return useContext(PreviewContext);
}

type Common = {
  blockId: string;
  action: TrackedAction;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  title?: string;
};

export function TrackedLink({
  href,
  download,
  ...props
}: Common & { href: string; download?: boolean | string }) {
  const preview = usePreview();
  const report = useActionTracker(props.blockId, props.action);
  const safe = safeUrl(href) ?? (href.startsWith("/") && !href.startsWith("//") ? href : null);
  if (!safe) return <span className={props.className}>{props.children}</span>;

  const external = isExternal(safe);
  return (
    <a
      href={safe}
      data-block={props.blockId}
      data-action={props.action}
      className={props.className}
      aria-label={props["aria-label"]}
      title={props.title}
      download={download === true ? "" : download || undefined}
      // A download from another origin (our storage) ignores `download` and
      // would replace the page: external links always open in a new tab.
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={preview ? (event) => event.preventDefault() : report}
      // A middle click opens the link too.
      onAuxClick={preview ? undefined : (event) => event.button === 1 && report()}
    >
      {props.children}
    </a>
  );
}

/** A call-to-action that opens something on the page (a service, a video). */
export function TrackedButton({ onClick, ...props }: Common & { onClick: () => void }) {
  const preview = usePreview();
  const report = useActionTracker(props.blockId, props.action);
  return (
    <button
      type="button"
      data-block={props.blockId}
      data-action={props.action}
      className={props.className}
      aria-label={props["aria-label"]}
      title={props.title}
      onClick={
        preview
          ? undefined
          : () => {
              report();
              onClick();
            }
      }
    >
      {props.children}
    </button>
  );
}
