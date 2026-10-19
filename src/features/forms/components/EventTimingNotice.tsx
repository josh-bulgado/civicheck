import { ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { TIMING_NOTICE } from "../event-timing-tone";
import type { EventTimingBehavior } from "../form-template.types";
import { NoticeAlert } from "./NoticeAlert";

const CTA =
  "inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold";

/** The button's look follows the notice's tone: filled for a suggestion, pale for a warning. */
const CTA_TONE = {
  default: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
  warning: "border-[#e0bd5c] bg-white/70 text-[#5c3a00] hover:bg-white",
  destructive: "border-destructive/40 bg-white/70 text-destructive hover:bg-white",
  success: "border-[#bfe3cf] bg-white/70 text-[#1a6a3c] hover:bg-white",
} as const;

/**
 * The notice an applicant sees when their event date falls outside the window.
 * With `onCta` the button is live; without it (the staff preview) it is only
 * drawn, so nothing in the preview can be clicked.
 */
export function EventTimingNotice({
  behavior,
  title,
  description,
  ctaLabel,
  onCta,
  role = "status",
}: {
  behavior: EventTimingBehavior;
  title: string;
  description: string;
  ctaLabel: string;
  onCta?: () => void;
  role?: "alert" | "status" | "group";
}) {
  const tone = TIMING_NOTICE[behavior];
  const buttonClass = cn(CTA, CTA_TONE[tone.variant]);
  const label = ctaLabel.trim();
  const arrow =
    behavior === "redirect_confirm" ? (
      <ArrowRight aria-hidden="true" className="size-4" />
    ) : null;

  return (
    <NoticeAlert
      variant={tone.variant}
      icon={tone.icon}
      role={role}
      title={title}
    >
      <span className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {description}
        {tone.cta && label ? (
          onCta ? (
            <button
              type="button"
              onClick={onCta}
              className={cn("civic-press", buttonClass)}
            >
              {label}
              {arrow}
            </button>
          ) : (
            <span className={buttonClass}>
              {label}
              {arrow}
            </span>
          )
        ) : null}
      </span>
    </NoticeAlert>
  );
}
