import { LegalPage, legalMetadata } from "@/components/marketing/legal-page";

export const metadata = legalMetadata("notice", "fr");

export default function Page() {
  return <LegalPage doc="notice" locale="fr" />;
}
