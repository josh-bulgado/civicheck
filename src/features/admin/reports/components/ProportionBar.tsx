import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { useGrown } from "~/features/admin/reports/use-grown";
import { cn } from "~/lib/utils";

const percentageFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

export interface ProportionSegment {
  key: string;
  label: string;
  count: number;
  /**
   * Whole class names for the bar and the legend's edge, when the segment means
   * something (released is green) rather than just being the next in line.
   */
  tone?: { bar: string; border: string };
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
 * A single stacked bar plus a legend, the pattern the Services Registry's
 * Classification Mix card used before its counts moved into the filter chips.
 * Used for the categorical splits that would be wasted on a full chart — sex,
 * purpose, intake channel, how requests ended.
 *
 * Every segment is named and counted in the legend, so the bar's colours only
 * repeat what is written beside it.
 */
export function ProportionBar({ segments }: { segments: ProportionSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const grown = useGrown();

  if (total === 0) return null;

  const toneOf = (segment: ProportionSegment, index: number) =>
    segment.tone ?? SEGMENT_STYLES[index % SEGMENT_STYLES.length];

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
              "h-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
              toneOf(segment, index).bar,
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
            className={cn("min-w-0 border-l-2 pl-3", toneOf(segment, index).border)}
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
