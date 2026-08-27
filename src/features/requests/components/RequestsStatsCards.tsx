import { useMemo } from "react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CountUp } from "~/components/motion/count-up";
import type { StaffRequestRow } from "../requests.queries";

interface RequestsStatsCardsProps {
  data: StaffRequestRow[];
}

const numberFormatter = new Intl.NumberFormat("en-PH");

export function RequestsStatsCards({ data }: RequestsStatsCardsProps) {
  const stats = useMemo(() => {
    const unpaid = data.filter((request) => request.paymentStatus !== "verified").length;
    return { total: data.length, unpaid };
  }, [data]);

  return (
    <Card role="region" aria-labelledby="request-pipeline-title">
      <CardHeader>
        <CardTitle>
          <h2 id="request-pipeline-title">Pipeline Overview</h2>
        </CardTitle>
        <CardDescription>
          {stats.total > 0
            ? `${numberFormatter.format(stats.unpaid)} of ${numberFormatter.format(stats.total)} requests still await payment verification.`
            : "No requests in the pipeline yet."}
        </CardDescription>
        <CardAction>
          <dl className="min-w-24 text-right">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Total Requests
            </dt>
            <dd className="mt-1 text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              <CountUp value={stats.total} />
            </dd>
          </dl>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
