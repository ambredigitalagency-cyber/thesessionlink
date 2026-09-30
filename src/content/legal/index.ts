import { notice } from "./notice";
import { privacy } from "./privacy";
import { terms } from "./terms";
import type { LegalDocumentKey } from "./types";

export { LEGAL_DOCUMENTS, LEGAL_PATHS } from "./types";
export type { LegalBlock, LegalDocument, LegalDocumentKey } from "./types";

export const LEGAL_CONTENT = { notice, terms, privacy } satisfies Record<LegalDocumentKey, unknown>;
