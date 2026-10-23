import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import {
  ProportionBar,
  type ProportionSegment,
} from "~/features/admin/reports/components/ProportionBar";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import {
  MIN_SAMPLE,
  SEX_LABELS,
  groupPurposes,
} from "~/features/admin/reports/service-report";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

interface ProfileProps {
  insight: ServiceInsight;
  service: ServiceReportRow | null;
}

/** How requests for this service reached the office: online or at the counter. */
export function IntakeChannelCard({ insight }: Pick<ProfileProps, "insight">) {
  const segments: ProportionSegment[] = [
    { key: "online", label: "Online", count: insight.channel.online },
    { key: "walkIn", label: "At the counter", count: insight.channel.walkIn },
  ].filter((segment) => segment.count > 0);

  return (
    <ReportPanel
      title="Online or at the Counter"
      description="Requests submitted online versus encoded at the counter by staff."
    >
      {insight.sampleSize > 0 ? (
        <ProportionBar segments={segments} />
      ) : (
        <InsufficientData count={0} />
      )}
    </ReportPanel>
  );
}

/**
 * Who the requests are about and why they were made.
 *
 * Both breakdowns are suppressed below MIN_SAMPLE: with a handful of requests
 * a "60% female" reads as a finding when it is really three people, and in an
 * office this size a thin cell crossed with a service can identify someone.
 * They sit behind "More detail" because no decision the office makes depends
 * on them.
 */
export function PeopleCards({ insight, service }: ProfileProps) {
  const sexSegments: ProportionSegment[] = Object.entries(insight.sex)
    .map(([key, count]) => ({ key, label: SEX_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
  const sexTotal = sexSegments.reduce((sum, segment) => sum + segment.count, 0);

  const purposeSegments: ProportionSegment[] = groupPurposes(insight.purpose).map(
    (row) => ({ key: row.label, label: row.label, count: row.count }),
  );
  const purposeTotal = purposeSegments.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <ReportPanel
        title="Who the Records Are About"
        description="Recorded sex of the people these requests are about. A marriage licence contributes two."
      >
        {sexTotal >= MIN_SAMPLE ? (
          <ProportionBar segments={sexSegments} />
        ) : (
          <InsufficientData count={sexTotal} noun="recorded subjects" />
        )}
      </ReportPanel>

      {service?.asksPurpose ? (
        <ReportPanel
          title="Purpose of Request"
          description="What applicants said they needed the document for."
        >
          {purposeTotal >= MIN_SAMPLE ? (
            <ProportionBar segments={purposeSegments} />
          ) : (
            <InsufficientData count={purposeTotal} noun="stated purposes" />
          )}
        </ReportPanel>
      ) : null}
    </>
  );
}
