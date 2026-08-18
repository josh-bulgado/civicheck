import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import type { HealthEvent, OperationalSignal } from "../system-admin.types";
import {
  formatHealthCount,
  formatHealthTimestamp,
} from "../system-health.utils";

export function ActiveIncidentsSection({
  events,
  signals,
  checkedAt,
}: {
  events: HealthEvent[];
  signals: OperationalSignal[];
  checkedAt: string;
}) {
  const activeEvents = events.filter(
    (event) => event.type === "degradation" && event.resolvedAt === null,
  );
  const degradedSignals = signals.filter(
    (signal) => signal.status === "degraded" || signal.status === "outage",
  );
  const activeIncidentCount = activeEvents.length + degradedSignals.length;

  return (
    <section aria-labelledby="active-incidents-title" aria-live="polite">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Live incident watch
          </p>
          <h2
            id="active-incidents-title"
            className="mt-1 scroll-mt-6 text-pretty text-xl font-bold tracking-tight"
          >
            Active Degradations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current incidents and affected components, ordered by the latest
            health check.
          </p>
        </div>
        <Badge
          variant={activeIncidentCount > 0 ? "destructive" : "secondary"}
          className="tabular-nums"
        >
          {formatHealthCount(activeIncidentCount)} active
        </Badge>
      </div>
      <div className="civic-stagger-auto flex flex-col gap-3">
        {activeEvents.map((event) => (
          <Alert
            key={event.id}
            variant={event.severity === "critical" ? "destructive" : "default"}
          >
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{event.title}</AlertTitle>
            <AlertDescription>
              <p className="break-words">{event.summary}</p>
              <p>
                Affected component: {event.component} · Started{" "}
                <time dateTime={event.timestamp} className="tabular-nums">
                  {formatHealthTimestamp(event.timestamp)}
                </time>
              </p>
            </AlertDescription>
          </Alert>
        ))}
        {degradedSignals.map((signal) => (
          <Alert
            key={`signal-${signal.key}`}
            variant={signal.status === "outage" ? "destructive" : "default"}
          >
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{signal.label} Needs Review</AlertTitle>
            <AlertDescription>
              <p className="break-words">
                <span className="font-semibold tabular-nums">
                  {signal.value}
                </span>
                . {signal.detail}
              </p>
              <p>
                Affected component: {signal.label} · Observed{" "}
                <time dateTime={checkedAt} className="tabular-nums">
                  {formatHealthTimestamp(checkedAt)}
                </time>
              </p>
            </AlertDescription>
          </Alert>
        ))}
        {activeIncidentCount === 0 ? (
          <Alert variant="success" role="status">
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>All Monitored Components Are Operational</AlertTitle>
            <AlertDescription>
              No active service incidents or workload bottlenecks were found at{" "}
              <time dateTime={checkedAt} className="tabular-nums">
                {formatHealthTimestamp(checkedAt)}
              </time>
              .
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
