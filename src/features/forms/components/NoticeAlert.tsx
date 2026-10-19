import type { ComponentType, ReactNode } from "react";
import { AlertCircle, AlertTriangle, BadgeCheck, Info } from "lucide-react";
import { cn } from "~/lib/utils";
import type { AnswerNotice } from "../form-template.types";

const ICONS = {
  default: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
  success: BadgeCheck,
};

// One tint per kind of message, on a 1px line of its own. Amber is only for
// timing warnings, red only for what must be fixed, green for done.
const TONES = {
  default: {
    box: "border-[#d5e1f5] bg-[#eef3fc] dark:border-health-info-border dark:bg-health-info-bg",
    title: "text-primary-hover",
    text: "text-body-2",
  },
  warning: {
    box: "border-[#f3d98a] bg-[#fdf1cf] dark:border-health-warning-border dark:bg-health-warning-bg",
    title: "text-tone-warning",
    text: "text-[#5c3a00] dark:text-health-warning-fg",
  },
  destructive: {
    box: "border-[#f5c6c1] bg-portal-danger-soft dark:border-health-error-border",
    title: "text-destructive",
    text: "text-[#6b1a14] dark:text-health-error-fg",
  },
  success: {
    box: "border-[#bfe3cf] dark:border-health-success-border bg-[#e7f6ee] dark:border-health-success-border dark:bg-health-success-bg",
    title: "text-tone-success",
    text: "text-body-strong",
  },
} as const;

/**
 * One look for every message the application form shows: a template's notice on
 * an answer, a derived-age note, the marriage-timing warning. The title and its
 * icon carry the tone; the text stays readable on the tint.
 */
export function NoticeAlert({
  variant,
  title,
  children,
  className,
  icon,
  role = "alert",
}: {
  variant: AnswerNotice["variant"];
  title: string;
  children: ReactNode;
  className?: string;
  /** Replaces the tone's usual glyph, e.g. a calendar for a date warning. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** "group" for a static preview, so editing it does not announce each keystroke. */
  role?: "alert" | "status" | "group";
}) {
  const Icon = icon ?? ICONS[variant];
  const tone = TONES[variant];

  return (
    <div
      role={role}
      className={cn("flex items-start gap-3.5 rounded-2xl border px-5 py-4.5", tone.box, className)}
    >
      <Icon className={cn("mt-px size-5.5 shrink-0", tone.title)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[17px] leading-snug font-bold", tone.title)}>{title}</p>
        <div className={cn("mt-1 text-[15px] leading-normal", tone.text)}>{children}</div>
      </div>
    </div>
  );
}
