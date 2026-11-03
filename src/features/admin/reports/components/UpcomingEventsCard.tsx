import { CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { staggerStyle } from "~/components/motion/stagger";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import { formatDateKey } from "~/lib/date";
import type { ServiceInsight } from "~/features/admin/reports/service-report.queries";

/**
 * Forward-dated events from requests already in the pipeline.
 *
 * Only meaningful for services whose event lies ahead — in practice the
 * marriage licence, which records an *intended* date. Doubly useful: it is the
 * forward-looking read of "when are people marrying", and it is the workload
 * the office has to schedule around, since a licence carries a 10-day posting
 * period before it can be released.
 */
export function UpcomingEventsCard({
  insight,
  eventLabel,
}: {
  insight: ServiceInsight;
  eventLabel: string;
}) {
  const total = insight.upcoming.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <ReportPanel
      title="Coming Up: Next 90 Days"
      description={`Upcoming ${eventLabel.toLowerCase()} recorded on requests filed in this period.`}
      action={total > 0 ? <Badge variant="secondary">{total} scheduled</Badge> : null}
    >
      {insight.upcoming.length > 0 ? (
        <ol className="civic-stagger flex flex-col gap-2">
          {insight.upcoming.map((entry, index) => (
            <li
              key={entry.date}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-light px-3 py-2"
              style={staggerStyle(index)}
            >
              <time dateTime={entry.date} className="text-base font-medium">
                {formatDateKey(entry.date)}
              </time>
              <span className="text-base font-bold tabular-nums">{entry.count}</span>
            </li>
          ))}
        </ol>
      ) : (
        <Alert className="civic-enter-sm">
          <CalendarClock aria-hidden="true" />
          <AlertTitle>Nothing Scheduled</AlertTitle>
          <AlertDescription>
            No request in this period records an upcoming date in the next 90 days.
          </AlertDescription>
        </Alert>
      )}
    </ReportPanel>
  );
}
