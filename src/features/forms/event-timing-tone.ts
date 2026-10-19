import {
  ArrowLeftRight,
  Ban,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  AnswerNotice,
  EventTimingBehavior,
} from "./form-template.types";

/**
 * How a window rule's notice looks for each response. The applicant form and
 * the staff editor's preview both read this, so the preview always shows what
 * applicants get.
 *
 * Blue suggests a switch, amber warns and lets them continue, red is a stop.
 * `cta` is whether the notice carries the switch button; it is also what decides
 * whether the editor asks for a button label.
 */
export const TIMING_NOTICE: Record<
  EventTimingBehavior,
  { variant: AnswerNotice["variant"]; icon: LucideIcon; cta: boolean }
> = {
  redirect_confirm: { variant: "default", icon: ArrowLeftRight, cta: true },
  warn_allow: { variant: "warning", icon: TriangleAlert, cta: true },
  block: { variant: "destructive", icon: Ban, cta: false },
  // Applicants are moved before they read it, so this only ever flashes.
  auto_route: { variant: "warning", icon: Zap, cta: false },
};
