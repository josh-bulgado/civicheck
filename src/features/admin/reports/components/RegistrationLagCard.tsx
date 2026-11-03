import { BarList } from "~/features/admin/reports/components/BarList";
import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
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
    key: bucket.key,
    label: bucket.label,
    value: insight.lag[bucket.key] ?? 0,
  })).filter((row) => row.value > 0);

  const eventLabel = service?.eventDateLabel?.toLowerCase() ?? "the event";

  return (
    <ReportPanel
      title="How Soon People Apply"
      description={`The gap between ${eventLabel} and the day the request reached the CCRO.`}
    >
      {insight.eventDated >= MIN_SAMPLE ? (
        <BarList rows={rows} label="Time from the event to the request" />
      ) : (
        <InsufficientData count={insight.eventDated} noun="dated requests" />
      )}
    </ReportPanel>
  );
}
