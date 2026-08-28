import { History } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import { LAG_BUCKETS, MIN_SAMPLE } from "~/features/admin/reports/service-report";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

/**
 * How long after the event people actually came to register it.
 *
 * This is the number that explains why delayed-registration services exist at
 * all, and it is the office's own lever: a long tail here is demand the CCRO
 * could pull forward with outreach.
 */
export function RegistrationLagCard({
  insight,
  service,
}: {
  insight: ServiceInsight;
  service: ServiceReportRow | null;
}) {
  const rows = LAG_BUCKETS.map((bucket) => ({
    ...bucket,
    count: insight.lag[bucket.key] ?? 0,
  })).filter((row) => row.count > 0);

  const max = Math.max(...rows.map((row) => row.count), 1);
  const eventLabel = service?.eventDateLabel?.toLowerCase() ?? "the event";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Time from Event to Request</h2>
        </CardTitle>
        <CardDescription>
          The gap between {eventLabel} and the day the request reached the CCRO.
        </CardDescription>
        <CardAction>
          <History className="size-5 text-primary" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {insight.eventDated >= MIN_SAMPLE ? (
          <ol className="civic-stagger flex flex-col gap-4" aria-label="Registration lag">
            {rows.map((row, index) => (
              <li
                key={row.key}
                className="grid grid-cols-[9rem_minmax(0,1fr)_2.5rem] items-center gap-3"
                style={staggerStyle(index)}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {row.label}
                </span>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-2"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-bold tabular-nums">
                  <CountUp value={row.count} duration={700} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <InsufficientData count={insight.eventDated} noun="dated requests" />
        )}
      </CardContent>
    </Card>
  );
}
