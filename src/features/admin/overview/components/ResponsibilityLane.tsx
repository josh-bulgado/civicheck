import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * One tone per responsibility. `solid` fills the icon tile, `soft` washes the
 * rows. Whole class names so Tailwind can find them.
 */
const LANE_TONES = {
  people: { solid: "bg-tone-progress", soft: "bg-tone-progress-soft" },
  services: { solid: "bg-tone-success", soft: "bg-tone-success-soft" },
  insight: { solid: "bg-health-info-dot", soft: "bg-health-info-bg" },
  requests: { solid: "bg-tone-review", soft: "bg-tone-review-soft" },
} as const;

export type LaneTone = keyof typeof LANE_TONES;

interface ResponsibilityLaneProps {
  tone: LaneTone;
  icon: LucideIcon;
  title: string;
  description: string;
  /** The lane's rows: one `<Link className={laneLinkClassName(tone)}>` each. */
  children: ReactNode;
}

/** A column of related places the administrator goes. */
export function ResponsibilityLane({
  tone,
  icon: Icon,
  title,
  description,
  children,
}: ResponsibilityLaneProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-card-foreground shadow-xs ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-3 px-1 pb-1">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-background",
            LANE_TONES[tone].solid,
          )}
        >
          <Icon className="size-[22px]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Class names for a row that is a router link. The caller renders `<Link>`, so
 * `to` and `search` stay checked against the route tree.
 */
export function laneLinkClassName(tone: LaneTone) {
  return cn(
    "civic-interactive flex min-h-14 flex-col justify-center rounded-xl px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
    LANE_TONES[tone].soft,
  );
}

export function LaneLinkBody({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-sm text-pretty text-muted-foreground">{description}</span>
    </>
  );
}
