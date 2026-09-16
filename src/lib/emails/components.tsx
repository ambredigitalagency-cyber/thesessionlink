import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/* Email palette mirrors the app: warm paper, ink type, coral accent. */
const colors = {
  page: "#f4f2ef",
  surface: "#ffffff",
  ink: "#0c0c0d",
  muted: "#63636b",
  subtle: "#93939c",
  line: "#ebe8e4",
  accent: "#f2542d",
  accentSoft: "#fff0ea",
};

const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function EmailLayout({
  preview,
  children,
  footerNote,
}: {
  preview: string;
  children: ReactNode;
  footerNote?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "40px 16px",
          backgroundColor: colors.page,
          fontFamily: fontStack,
          color: colors.ink,
        }}
      >
        <Container style={{ maxWidth: "520px", margin: "0 auto" }}>
          <Text
            style={{
              margin: "0 0 20px",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: colors.muted,
            }}
          >
            TheSessionLink
          </Text>
          <Section
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.line}`,
              borderRadius: "24px",
              padding: "36px",
            }}
          >
            {children}
          </Section>
          <Text
            style={{
              margin: "24px 0 0",
              fontSize: "12px",
              lineHeight: "18px",
              color: colors.subtle,
              textAlign: "center",
            }}
          >
            {footerNote ?? "Sent by TheSessionLink"}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        margin: "0 0 12px",
        fontSize: "24px",
        lineHeight: "1.25",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: colors.ink,
      }}
    >
      {children}
    </Heading>
  );
}

export function EmailText({
  children,
  muted = false,
  small = false,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: small ? "13px" : "15px",
        lineHeight: small ? "20px" : "24px",
        color: muted ? colors.muted : colors.ink,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ margin: "24px 0 8px" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: colors.ink,
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 500,
          textDecoration: "none",
          padding: "13px 24px",
          borderRadius: "999px",
        }}
      >
        {label}
      </Link>
    </Section>
  );
}

/** Key/value block used for booking summaries. */
export function EmailDetails({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <Section
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: "16px",
        padding: "18px 20px",
        margin: "0 0 20px",
      }}
    >
      {rows.map((row, index) => (
        <Section key={row.label} style={{ marginTop: index === 0 ? 0 : "12px" }}>
          <Text
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colors.muted,
            }}
          >
            {row.label}
          </Text>
          <Text
            style={{
              margin: "2px 0 0",
              fontSize: "15px",
              lineHeight: "22px",
              fontWeight: 500,
              color: colors.ink,
            }}
          >
            {row.value}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: colors.line, margin: "24px 0" }} />;
}

export function EmailQuote({ children }: { children: ReactNode }) {
  return (
    <Section
      style={{
        borderLeft: `3px solid ${colors.line}`,
        paddingLeft: "14px",
        margin: "0 0 20px",
      }}
    >
      <Text style={{ margin: 0, fontSize: "14px", lineHeight: "22px", color: colors.muted }}>
        {children}
      </Text>
    </Section>
  );
}

export { colors as emailColors };
