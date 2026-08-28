import { CalendarHeart } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import {
  MIN_SAMPLE,
  MONTH_ABBREVIATIONS,
} from "~/features/admin/reports/service-report";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

const chartConfig = {
  count: { label: "Records", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * Month-of-year distribution of the *event* being registered — the date of
 * marriage, birth, or death itself, not the date the request was filed.
 *
 * Years are collapsed on purpose: the question is which months people marry in,
 * not what happened in March 2026. That makes this the one chart on the page
 * that describes Legazpi rather than the office.
 */
export function EventSeasonalityCard({
  insight,
  service,
}: {
  insight: ServiceInsight;
  service: ServiceReportRow | null;
}) {
  const eventLabel = service?.eventDateLabel ?? "Date of event";
  const isFuture = service?.eventDateDirection === "future";

  const data = insight.seasonality.map((bucket) => ({
    month: MONTH_ABBREVIATIONS[bucket.month - 1] ?? String(bucket.month),
    count: bucket.count,
  }));

  const peak = insight.seasonality.reduce(
    (best, bucket) => (bucket.count > best.count ? bucket : best),
    { month: 0, count: 0 },
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>
          <h2>{eventLabel} by Month of Year</h2>
        </CardTitle>
        <CardDescription>
          {isFuture
            ? "When the couples in this period intend to marry, grouped by calendar month across every year in range."
            : `When the recorded events actually happened, grouped by calendar month across every year in range. Not when the request was filed.`}
        </CardDescription>
        <CardAction>
          <CalendarHeart className="size-5 text-primary" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {insight.eventDated >= MIN_SAMPLE ? (
          <>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={data} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>

            <p className="text-sm text-muted-foreground">
              {peak.count > 0 ? (
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
              {insight.eventDated === 1 ? "" : "s"} filed through CiviCheck that
              recorded a date. This is a sample of office activity, not a
              complete civil registry of Legazpi.
            </p>
          </>
        ) : (
          <InsufficientData count={insight.eventDated} noun="dated requests" />
        )}
      </CardContent>
    </Card>
  );
}
