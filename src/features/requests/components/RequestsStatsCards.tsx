import { useEffect, useMemo, useState } from "react";
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
import { cn } from "~/lib/utils";
import { STAGES, STAGE_STATUSES } from "../request-queue";
import { STAGE_LABELS, type WorkflowStage } from "../request-workflow";
import type { StaffRequestRow } from "../requests.queries";

interface RequestsStatsCardsProps {
  data: StaffRequestRow[];
}

const numberFormatter = new Intl.NumberFormat("en-PH");
const percentageFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

const stageDetails: Record<
  WorkflowStage,
  { detail: string; barClassName: string; borderClassName: string }
> = {
  1: {
    detail: "Awaiting front-desk check",
    barClassName: "bg-muted-2",
    borderClassName: "border-muted-2",
  },
  2: {
    detail: "Requirements being verified",
    barClassName: "bg-warning",
    borderClassName: "border-warning",
  },
  3: {
    detail: "Record being prepared",
    barClassName: "bg-primary",
    borderClassName: "border-primary",
  },
  4: {
    detail: "Awaiting registrar sign-off",
    barClassName: "bg-brand-gold",
    borderClassName: "border-brand-gold",
  },
  5: {
    detail: "Payment and hand-over",
    barClassName: "bg-success",
    borderClassName: "border-success",
  },
};

export function RequestsStatsCards({ data }: RequestsStatsCardsProps) {
  const stats = useMemo(() => {
    const byStage = {} as Record<WorkflowStage, number>;
    for (const stage of STAGES) byStage[stage] = 0;

    let unpaid = 0;
    for (const request of data) {
      for (const stage of STAGES) {
        if (STAGE_STATUSES[stage].includes(request.status)) {
          byStage[stage] += 1;
          break;
        }
      }
      if (request.paymentStatus !== "verified") unpaid += 1;
    }

    return { total: data.length, byStage, unpaid };
  }, [data]);

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Card role="region" aria-labelledby="request-pipeline-title">
      <CardHeader className="border-b">
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

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <p className="font-semibold text-body-strong">Stage Mix</p>
            <p className="text-right text-muted-foreground tabular-nums">
              across 5 workflow stages
            </p>
          </div>

          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-secondary"
            aria-hidden="true"
          >
            {STAGES.map((stage, index) => {
              const percentage =
                stats.total > 0 ? stats.byStage[stage] / stats.total : 0;

              return (
                <div
                  key={stage}
                  className={cn(
                    "h-full transition-[width] duration-700 ease-out",
                    stageDetails[stage].barClassName,
                  )}
                  style={{
                    width: grown ? `${percentage * 100}%` : "0%",
                    transitionDelay: `${index * 60}ms`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <dl className="civic-stagger grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-6 gap-y-5">
          {STAGES.map((stage, index) => {
            const count = stats.byStage[stage];
            const percentage = stats.total > 0 ? count / stats.total : 0;

            return (
              <div
                key={stage}
                style={staggerStyle(index)}
                className={cn(
                  "min-w-0 border-l-2 pl-3",
                  stageDetails[stage].borderClassName,
                )}
              >
                <dt className="text-sm font-semibold text-foreground">
                  {STAGE_LABELS[stage]}
                </dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    <CountUp value={count} />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {percentageFormatter.format(percentage)}
                  </span>
                  <span className="basis-full text-xs text-muted-foreground">
                    {stageDetails[stage].detail}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
