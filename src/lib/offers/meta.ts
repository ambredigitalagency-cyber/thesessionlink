import type { LucideIcon } from "lucide-react";
import { FileText, MessageCircle, MessageSquareText } from "lucide-react";

import type { ActionType } from "./schema";

export const ACTION_ICONS: Record<ActionType, LucideIcon> = {
  contact_request: MessageSquareText,
  whatsapp_direct: MessageCircle,
  quote_request: FileText,
};
