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
import { Service } from "../services.types";

interface ServicesStatsCardsProps {
  data: Service[];
}

const numberFormatter = new Intl.NumberFormat("en-PH");
const percentageFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

const classificationDetails = [
  {
    key: "simple",
    label: "Simple",
    detail: "Standard workflow",
    barClassName: "bg-success",
    borderClassName: "border-success",
  },
  {
    key: "complex",
    label: "Complex",
    detail: "Extended verification",
    barClassName: "bg-warning",
    borderClassName: "border-warning",
  },
  {
    key: "highlyTechnical",
    label: "Highly Technical",
    detail: "Specialized review",
    barClassName: "bg-primary",
    borderClassName: "border-primary",
  },
] as const;

const unclassifiedDetails = {
  key: "unclassified",
  label: "Unclassified",
  detail: "Needs classification",
  barClassName: "bg-muted-2",
  borderClassName: "border-muted-2",
} as const;

export function ServicesStatsCards({ data }: ServicesStatsCardsProps) {
  const stats = useMemo(
    () =>
      data.reduce(
        (counts, service) => {
          switch (service.classification) {
            case "simple":
              counts.simple += 1;
              break;
            case "complex":
              counts.complex += 1;
              break;
            case "highly_technical":
              counts.highlyTechnical += 1;
              break;
            default:
              counts.unclassified += 1;
          }

          return counts;
        },
        {
          total: data.length,
          simple: 0,
          complex: 0,
          highlyTechnical: 0,
          unclassified: 0,
        },
      ),
    [data],
  );

  const visibleClassifications =
    stats.unclassified > 0
      ? [...classificationDetails, unclassifiedDetails]
      : classificationDetails;
  const classifiedCount = stats.total - stats.unclassified;

  // The classification-mix bar renders at zero width and grows to its real
  // proportions once mounted, so the mix reads as filling in rather than
  // appearing pre-drawn.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Card role="region" aria-labelledby="registry-overview-title">
      <CardHeader className="border-b">
        <CardTitle>
          <h2 id="registry-overview-title">Registry Overview</h2>
        </CardTitle>
        <CardDescription>
          {stats.total > 0
            ? `${numberFormatter.format(classifiedCount)} of ${numberFormatter.format(stats.total)} services have a classification.`
            : "No registered services to classify."}
        </CardDescription>
        <CardAction>
          <dl className="min-w-24 text-right">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Total Services
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
            <p className="font-semibold text-body-strong">Classification Mix</p>
            <p className="text-right text-muted-foreground tabular-nums">
              {numberFormatter.format(classifiedCount)} classified
            </p>
          </div>

          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-secondary"
            aria-hidden="true"
          >
            {visibleClassifications.map((classification, index) => {
              const count = stats[classification.key];
              const percentage = stats.total > 0 ? count / stats.total : 0;

              return (
                <div
                  key={classification.key}
                  className={cn(
                    "h-full transition-[width] duration-700 ease-out",
                    classification.barClassName,
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
          {visibleClassifications.map((classification, index) => {
            const count = stats[classification.key];
            const percentage = stats.total > 0 ? count / stats.total : 0;

            return (
              <div
                key={classification.key}
                style={staggerStyle(index)}
                className={cn(
                  "min-w-0 border-l-2 pl-3",
                  classification.borderClassName,
                )}
              >
                <dt className="text-sm font-semibold text-foreground">
                  {classification.label}
                </dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    <CountUp value={count} />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {percentageFormatter.format(percentage)}
                  </span>
                  <span className="basis-full text-xs text-muted-foreground">
                    {classification.detail}
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
