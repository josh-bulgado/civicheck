import { useEffect, useState } from "react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

const percentageFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

export interface ProportionSegment {
  key: string;
  label: string;
  count: number;
}

const SEGMENT_STYLES = [
  { bar: "bg-chart-1", border: "border-chart-1" },
  { bar: "bg-chart-2", border: "border-chart-2" },
  { bar: "bg-chart-3", border: "border-chart-3" },
  { bar: "bg-chart-4", border: "border-chart-4" },
  { bar: "bg-chart-5", border: "border-chart-5" },
  { bar: "bg-muted-2", border: "border-muted-2" },
] as const;

/**
 * A single stacked bar plus a legend, following the Classification Mix pattern
 * in ServicesStatsCards. Used for the categorical splits that would be wasted
 * on a full chart — sex, purpose, intake channel.
 *
 * Segments render at zero width and grow once mounted, so the mix reads as
 * filling in rather than appearing pre-drawn.
 */
export function ProportionBar({ segments }: { segments: ProportionSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-secondary"
        aria-hidden="true"
      >
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            className={cn(
              "h-full transition-[width] duration-700 ease-out",
              SEGMENT_STYLES[index % SEGMENT_STYLES.length].bar,
            )}
            style={{
              width: grown ? `${(segment.count / total) * 100}%` : "0%",
              transitionDelay: `${index * 60}ms`,
            }}
          />
        ))}
      </div>

      <dl className="civic-stagger grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-6 gap-y-4">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            style={staggerStyle(index)}
            className={cn(
              "min-w-0 border-l-2 pl-3",
              SEGMENT_STYLES[index % SEGMENT_STYLES.length].border,
            )}
          >
            <dt className="text-sm font-semibold text-foreground">{segment.label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-extrabold tracking-tight tabular-nums">
                <CountUp value={segment.count} />
              </span>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                {percentageFormatter.format(segment.count / total)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
