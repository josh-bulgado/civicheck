import { FileClock, FileSearch, ListChecks, TicketCheck, type LucideIcon } from "lucide-react";
import type { WorkflowStage } from "./request-workflow";

/** The icon each workflow stage wears next to its colour (`STAGE_TONES`). */
export const STAGE_ICONS: Record<WorkflowStage, LucideIcon> = {
  1: FileClock,
  2: FileSearch,
  3: ListChecks,
  4: TicketCheck,
};
