import type { ReactNode } from "react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

/**
 * The row of headline figures on a citizen portal header card: a big number
 * over its label, hairlines between them. Below `sm` the figures share the
 * card's full width instead of crowding the title.
 */
export function StatFigures({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "civic-stagger grid w-full auto-cols-fr grid-flow-col sm:flex sm:w-auto",
        className,
      )}
    >
      {children}
    </dl>
  );
}

interface StatFigureProps {
  label: string;
  value: number;
  /** Position in the row, for the stagger. */
  index: number;
  /** Background class for the status dot; omit for a figure with no dot. */
  dotClassName?: string;
  /** `lg` leads a page, `md` sits beside a section heading. */
  size?: "lg" | "md";
}

export function StatFigure({
  label,
  value,
  index,
  dotClassName,
  size = "lg",
}: StatFigureProps) {
  return (
    // Reversed so the number reads first while the label stays the `dt`.
    <div
      style={staggerStyle(index)}
      className="flex flex-col-reverse justify-end gap-1 border-l border-border-light px-3 first:border-l-0 first:pl-0 last:pr-0 sm:items-end sm:px-6"
    >
      <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground sm:whitespace-nowrap">
        {dotClassName && (
          <span
            className={cn("size-1.75 shrink-0 rounded-full", dotClassName)}
            aria-hidden="true"
          />
        )}
        {label}
      </dt>
      <dd
        className={cn(
          "leading-none font-semibold text-foreground tabular-nums",
          size === "lg"
            ? "text-[2rem] tracking-[-0.03em] sm:text-[2.5rem]"
            : "text-[1.75rem] tracking-[-0.02em]",
        )}
      >
        <CountUp value={value} />
      </dd>
    </div>
  );
}
