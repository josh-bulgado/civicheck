import { Disclosure } from "~/features/admin/reports/components/Disclosure";
import { EventSeasonalityCard } from "~/features/admin/reports/components/EventSeasonalityCard";
import { RegistrationLagCard } from "~/features/admin/reports/components/RegistrationLagCard";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import {
  IntakeChannelCard,
  PeopleCards,
} from "~/features/admin/reports/components/ServiceProfileCards";
import { UpcomingEventsCard } from "~/features/admin/reports/components/UpcomingEventsCard";
import { formatCount, formatDays, pluralize } from "~/features/admin/reports/report-summary";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

interface ServiceInsightPanelProps {
  service: ServiceReportRow | null;
  insight: ServiceInsight;
  departmentName: string;
}

const STATS = (service: ServiceReportRow) =>
  [
    { label: "Released", value: formatCount(service.released) },
    { label: "Average days", value: formatDays(service.avgReleaseDays) },
    { label: "Still open", value: formatCount(service.pending) },
    { label: "Sent back", value: formatCount(service.incomplete) },
  ] as const;

/**
 * What one service looks like: its figures, then the patterns in who asks and
 * when. Each pattern states its own sample, and says so instead of drawing a
 * chart when the sample is too small to describe anything.
 */
export function ServiceInsightPanel({
  service,
  insight,
  departmentName,
}: ServiceInsightPanelProps) {
  if (!service) {
    return (
      <ReportPanel
        title="Pick a Service"
        description="Choose a row in the table to see how often it is asked for, and when."
      >
        <p className="text-base text-muted-foreground">
          Nothing is selected yet.
        </p>
      </ReportPanel>
    );
  }

  const showUpcoming = service.eventDateDirection === "future";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Only the name and figures are announced when another service is picked. */}
      <div aria-live="polite">
        <ReportPanel
          title={service.label}
          description={`${departmentName} · ${formatCount(service.total)} ${pluralize(service.total, "request")}`}
        >
          <dl className="grid grid-cols-2 gap-3">
            {STATS(service).map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse rounded-lg border border-border-light bg-surface-subtle px-3 py-2"
              >
                <dd className="text-2xl font-extrabold leading-tight tracking-tight tabular-nums">
                  {stat.value}
                </dd>
                <dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </ReportPanel>
      </div>

      <EventSeasonalityCard insight={insight} service={service} />
      {showUpcoming ? (
        <UpcomingEventsCard
          insight={insight}
          eventLabel={service.eventDateLabel ?? "events"}
        />
      ) : (
        <RegistrationLagCard insight={insight} service={service} />
      )}
      <IntakeChannelCard insight={insight} />

      <Disclosure label="More Detail: Who the Records Are About" className="flex flex-col gap-4">
        <PeopleCards insight={insight} service={service} />
      </Disclosure>
    </div>
  );
}
