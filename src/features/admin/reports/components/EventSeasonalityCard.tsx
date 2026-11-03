import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import {
  MIN_SAMPLE,
  MONTH_ABBREVIATIONS,
  seasonalityPeak,
} from "~/features/admin/reports/service-report";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

const chartConfig = {
  count: { label: "Records", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface SeasonalityProps {
  insight: ServiceInsight;
  service: ServiceReportRow | null;
}

/** The title both the panel and the briefing use: "Date of birth by Month of Year". */
export function seasonalityTitle(service: ServiceReportRow | null): string {
  return `${service?.eventDateLabel ?? "Date of event"} by Month of Year`;
}

/**
 * Month-of-year distribution of the *event* being registered — the date of
 * marriage, birth, or death itself, not the date the request was filed.
 *
 * Years are collapsed on purpose: the question is which months people marry in,
 * not what happened in March 2026. That makes this the one chart on the page
 * that describes Legazpi rather than the office. Below MIN_SAMPLE it says so
 * instead of drawing a pattern.
 */
export function SeasonalityChart({ insight }: Pick<SeasonalityProps, "insight">) {
  if (insight.eventDated < MIN_SAMPLE) {
    return <InsufficientData count={insight.eventDated} noun="dated requests" />;
  }

  const data = insight.seasonality.map((bucket) => ({
    month: MONTH_ABBREVIATIONS[bucket.month - 1] ?? String(bucket.month),
    count: bucket.count,
  }));
  const peak = seasonalityPeak(insight.seasonality);

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart accessibilityLayer data={data} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>

      <p className="text-sm text-muted-foreground">
        {peak ? (
          <>
            Most common month:{" "}
            <strong className="font-semibold text-foreground">
              {MONTH_ABBREVIATIONS[peak.month - 1]}
            </strong>{" "}
            ({peak.count.toLocaleString("en-PH")} of{" "}
            {insight.eventDated.toLocaleString("en-PH")}).{" "}
          </>
        ) : null}
        Based on {insight.eventDated.toLocaleString("en-PH")} request
        {insight.eventDated === 1 ? "" : "s"} filed through CiviCheck that recorded
        a date. This is a sample of office activity, not a complete civil registry
        of Legazpi.
      </p>
    </div>
  );
}

export function EventSeasonalityCard({ insight, service }: SeasonalityProps) {
  const isFuture = service?.eventDateDirection === "future";

  return (
    <ReportPanel
      title={seasonalityTitle(service)}
      description={
        isFuture
          ? "When the couples in this period intend to marry, grouped by calendar month across every year in range."
          : "When the recorded events actually happened, grouped by calendar month across every year in range. Not when the request was filed."
      }
    >
      <SeasonalityChart insight={insight} />
    </ReportPanel>
  );
}
