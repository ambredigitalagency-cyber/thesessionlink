import { LegalPage, legalMetadata } from "@/components/marketing/legal-page";

export const metadata = legalMetadata("privacy", "fr");

export default function Page() {
  return <LegalPage doc="privacy" locale="fr" />;
}
