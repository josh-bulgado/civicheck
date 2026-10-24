import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import type { HealthSource } from "../system-admin.types";

/** A row of figures: a small label under a mono value. */
export function HealthMetrics({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-wrap gap-x-8 gap-y-3", className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Where a figure comes from: what measures it, how often, and what it exposes. */
export function HealthSourceBlock({
  source,
  className,
  children,
}: {
  source: HealthSource;
  className?: string;
  children?: ReactNode;
}) {
  const facts = [
    { label: "Measured by", value: source.measuredBy },
    { label: "Updates", value: source.updates },
    { label: "Exposure", value: source.exposure },
  ];
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-dashed border-border-strong pt-3", className)}>
      <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-2 max-sm:basis-full sm:grid-cols-3">
        {facts.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm text-pretty">{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
