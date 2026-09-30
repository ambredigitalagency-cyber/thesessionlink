import { LegalPage, legalMetadata } from "@/components/marketing/legal-page";

export const metadata = legalMetadata("privacy", "en");

export default function Page() {
  return <LegalPage doc="privacy" locale="en" />;
}
