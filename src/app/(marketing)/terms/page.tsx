import { LegalPage, legalMetadata } from "@/components/marketing/legal-page";

export const metadata = legalMetadata("terms", "en");

export default function Page() {
  return <LegalPage doc="terms" locale="en" />;
}
