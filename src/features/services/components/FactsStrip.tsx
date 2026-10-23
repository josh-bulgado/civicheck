import type { ComponentType, ReactNode } from "react";
import { cn } from "~/lib/utils";

export interface Fact {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  /** One line under the value. */
  hint?: ReactNode;
}

/**
 * The few numbers a checklist opens with, side by side in one bordered strip:
 * what it costs, how long it takes, how many documents. Past two facts the
 * strip stacks on a phone, where three columns would squeeze their values.
 */
export function FactsStrip({ facts }: { facts: Fact[] }) {
  return (
    <dl
      className={cn(
        "grid auto-cols-fr grid-flow-col divide-x divide-border-light rounded-[10px] border border-border-light",
        facts.length > 2 &&
          "max-sm:grid-flow-row max-sm:divide-x-0 max-sm:divide-y",
      )}
    >
      {facts.map(({ icon: Icon, label, value, hint }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </dt>
          <dd className="text-lg font-bold text-foreground">{value}</dd>
          {hint ? <dd className="text-xs text-body">{hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
