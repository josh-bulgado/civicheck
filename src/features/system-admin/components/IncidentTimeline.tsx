import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { HealthEvent } from "../system-admin.types";
import { formatHealthTimestamp } from "../system-health.utils";

function EventRow({ event }: { event: HealthEvent }) {
  const isActive = event.resolvedAt === null && event.type === "degradation";

  return (
    <li className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:px-6">
      <span
        className={cn(
          "mt-1.5 size-2.5 rounded-full",
          event.severity === "critical"
            ? "bg-destructive"
            : event.severity === "warning"
              ? "bg-warning"
              : "bg-success",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words text-sm font-bold text-foreground">
            {event.title}
          </h3>
          {isActive ? (
            <Badge variant="destructive">Active</Badge>
          ) : event.type === "recovery" ? (
            <Badge variant="secondary">Recovered</Badge>
          ) : null}
        </div>
        <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
          {event.summary}
        </p>
        <p className="mt-2 break-words text-xs font-medium text-muted-foreground">
          {event.component}
          {event.relatedAuditEventId ? " · Linked administrative action" : ""}
        </p>
      </div>
      <time
        dateTime={event.timestamp}
        className="text-xs font-medium text-muted-foreground tabular-nums sm:text-right"
      >
        {formatHealthTimestamp(event.timestamp)}
      </time>
    </li>
  );
}

export function IncidentTimeline({ events }: { events: HealthEvent[] }) {
  return (
    <section
      className="dashboard-panel overflow-hidden"
      aria-labelledby="events-title"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-end sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Operational timeline
          </p>
          <h2
            id="events-title"
            className="mt-1 scroll-mt-6 text-pretty text-xl font-bold tracking-tight"
          >
            Recent Incident Activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Service transitions, recoveries, maintenance, and linked
            administrative actions.
          </p>
        </div>
        <Link
          to="/system-admin/audit"
          search={{
            page: 1,
            actor: undefined,
            event: undefined,
            source: "system",
            from: undefined,
            to: undefined,
          }}
          className="touch-manipulation rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open Audit Center filtered to system events"
        >
          Open Audit Center
        </Link>
      </div>
      {events.length > 0 ? (
        <ul aria-label="Recent incident events">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <div className="px-5 py-10 text-center sm:px-6">
          <ShieldCheck
            className="mx-auto size-8 text-success"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-bold text-foreground">
            No Recent Incidents
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Degradations, recoveries, and maintenance events will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
