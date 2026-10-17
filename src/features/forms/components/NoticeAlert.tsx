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
    box: "border-primary-soft bg-primary-tint",
    title: "text-primary-hover",
    text: "text-body-2",
  },
  warning: {
    box: "border-warning-border bg-tone-warning-soft",
    title: "text-tone-warning",
    text: "text-tone-warning",
  },
  destructive: {
    box: "border-destructive/25 bg-portal-danger-soft",
    title: "text-destructive",
    text: "text-[#6b1a14] dark:text-tone-danger",
  },
  success: {
    box: "border-success/30 bg-success-soft",
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
  role?: "alert" | "status";
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
