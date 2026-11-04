import {
  EmailButton,
  EmailDetails,
  EmailDivider,
  EmailHeading,
  EmailLayout,
  EmailQuote,
  EmailText,
} from "./components";

export type DetailRow = { label: string; value: string };

export function MagicLinkEmail({
  url,
  copy,
}: {
  url: string;
  copy: {
    preview: string;
    heading: string;
    body: string;
    cta: string;
    fallback: string;
    ignore: string;
  };
}) {
  return (
    <EmailLayout preview={copy.preview} footerNote={copy.ignore}>
      <EmailHeading>{copy.heading}</EmailHeading>
      <EmailText muted>{copy.body}</EmailText>
      <EmailButton href={url} label={copy.cta} />
      <EmailDivider />
      <EmailText small muted>
        {copy.fallback}
        <br />
        {url}
      </EmailText>
    </EmailLayout>
  );
}

/**
 * One layout for every notice (a request to the coach, its acknowledgement,
 * the deletion warning). Keeps the voice identical from one email to the next.
 */
export function NoticeEmail({
  preview,
  heading,
  intro,
  rows,
  message,
  messageLabel,
  cta,
  note,
  footerNote,
}: {
  preview: string;
  heading: string;
  intro: string;
  rows: DetailRow[];
  message?: string | null;
  messageLabel?: string;
  cta?: { href: string; label: string };
  note?: string;
  footerNote?: string;
}) {
  return (
    <EmailLayout preview={preview} footerNote={footerNote}>
      <EmailHeading>{heading}</EmailHeading>
      <EmailText muted>{intro}</EmailText>
      <EmailDetails rows={rows} />
      {message ? (
        <>
          <EmailText small muted>
            {messageLabel}
          </EmailText>
          <EmailQuote>{message}</EmailQuote>
        </>
      ) : null}
      {cta ? <EmailButton href={cta.href} label={cta.label} /> : null}
      {note ? (
        <>
          <EmailDivider />
          <EmailText small muted>
            {note}
          </EmailText>
        </>
      ) : null}
    </EmailLayout>
  );
}
