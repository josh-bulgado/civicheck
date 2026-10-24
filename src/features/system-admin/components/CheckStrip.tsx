import { cn } from "~/lib/utils";
import type { CheckOutcome, HealthCheck } from "../system-admin.types";
import { HEALTH_EVERY_MINUTES } from "../system-health.model";

/** How many ticks a strip shows: 24 checks, 15 minutes apart, is the last six hours. */
const TICKS = 24;

// A slow or failed check differs in shape, not only colour: slow is striped and outlined,
// failed is short and solid. Someone who cannot tell the colours apart still reads the strip.
const tickClass = {
  ok: "h-5 bg-health-success-dot",
  slow: "h-5 bg-[repeating-linear-gradient(135deg,var(--health-warning-dot)_0_2px,transparent_2px_4px)] ring-1 ring-inset ring-health-warning-dot",
  failed: "h-2.5 self-end bg-health-error-dot",
} satisfies Record<CheckOutcome, string>;

const outcomeWord = { ok: "passed", slow: "slow", failed: "failed" } satisfies Record<CheckOutcome, string>;

/** One tick per stored check, oldest on the left. */
export function CheckStrip({
  checks,
  className,
}: {
  checks: HealthCheck[];
  className?: string;
}) {
  const recent = checks.slice(-TICKS);
  if (recent.length === 0) {
    return <span className="text-sm text-muted-foreground">No checks yet</span>;
  }

  const count = (outcome: CheckOutcome) => recent.filter((check) => check.outcome === outcome).length;
  const latest = recent[recent.length - 1];

  return (
    <span
      role="img"
      aria-label={`Last ${recent.length} checks: ${count("ok")} passed, ${count("slow")} slow, ${count("failed")} failed. The latest ${outcomeWord[latest.outcome]}.`}
      className={cn("inline-flex h-5 items-end gap-0.5", className)}
    >
      {recent.map((check, index) => (
        <i
          key={`${check.at}-${index}`}
          aria-hidden="true"
          className={cn("w-1 rounded-[1px]", tickClass[check.outcome])}
        />
      ))}
    </span>
  );
}

/** The key to the three tick shapes, shown once above the list. */
export function CheckStripLegend({ className }: { className?: string }) {
  const entries = [
    { outcome: "ok", label: "Passed" },
    { outcome: "slow", label: "Slow, over its limit" },
    { outcome: "failed", label: "Failed, no answer" },
  ] as const;

  return (
    <ul
      aria-label="Check strip key"
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground", className)}
    >
      {entries.map(({ outcome, label }) => (
        <li key={outcome} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex h-5 items-end">
            <i className={cn("w-1 rounded-[1px]", tickClass[outcome])} />
          </span>
          {label}
        </li>
      ))}
      <li>
        Each tick is one check, {HEALTH_EVERY_MINUTES} minutes apart: the last 6 hours.
      </li>
    </ul>
  );
}
