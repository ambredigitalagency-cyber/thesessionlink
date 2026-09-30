import { LegalPage, legalMetadata } from "@/components/marketing/legal-page";

export const metadata = legalMetadata("terms", "fr");

export default function Page() {
  return <LegalPage doc="terms" locale="fr" />;
}
