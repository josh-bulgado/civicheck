import { Building2, Users } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { InsufficientData } from "~/features/admin/reports/components/InsufficientData";
import {
  ProportionBar,
  type ProportionSegment,
} from "~/features/admin/reports/components/ProportionBar";
import {
  MIN_SAMPLE,
  SEX_LABELS,
  groupPurposes,
} from "~/features/admin/reports/service-report";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

/**
 * Who the requests are about and why they were made.
 *
 * Both breakdowns are suppressed below MIN_SAMPLE: with a handful of requests
 * a "60% female" reads as a finding when it is really three people, and in an
 * office this size a thin cell crossed with a service can identify someone.
 */
export function ServiceProfileCards({
  insight,
  service,
}: {
  insight: ServiceInsight;
  service: ServiceReportRow | null;
}) {
  const sexSegments: ProportionSegment[] = Object.entries(insight.sex)
    .map(([key, count]) => ({
      key,
      label: SEX_LABELS[key] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const sexTotal = sexSegments.reduce((sum, segment) => sum + segment.count, 0);

  const purposeSegments: ProportionSegment[] = groupPurposes(insight.purpose).map(
    (row) => ({ key: row.label, label: row.label, count: row.count }),
  );
  const purposeTotal = purposeSegments.reduce((sum, row) => sum + row.count, 0);

  const channelSegments: ProportionSegment[] = [
    { key: "online", label: "Online", count: insight.channel.online },
    { key: "walkIn", label: "Walk-in", count: insight.channel.walkIn },
  ].filter((segment) => segment.count > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Subjects</h2>
          </CardTitle>
          <CardDescription>
            Recorded sex of the people these requests are about. A marriage
            licence contributes two.
          </CardDescription>
          <CardAction>
            <Users className="size-5 text-primary" aria-hidden="true" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5">
          {sexTotal >= MIN_SAMPLE ? (
            <ProportionBar segments={sexSegments} />
          ) : (
            <InsufficientData count={sexTotal} noun="recorded subjects" />
          )}
        </CardContent>
      </Card>

      {service?.asksPurpose ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Purpose of Request</h2>
            </CardTitle>
            <CardDescription>
              What applicants said they needed the document for.
            </CardDescription>
            <CardAction>
              <Building2 className="size-5 text-primary" aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            {purposeTotal >= MIN_SAMPLE ? (
              <ProportionBar segments={purposeSegments} />
            ) : (
              <InsufficientData count={purposeTotal} noun="stated purposes" />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Intake Channel</h2>
          </CardTitle>
          <CardDescription>
            Requests submitted online versus encoded at the counter by staff.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5">
          {insight.sampleSize > 0 ? (
            <ProportionBar segments={channelSegments} />
          ) : (
            <InsufficientData count={0} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
