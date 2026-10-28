import { useState, type ReactNode } from "react";
import { QuietLink as Link } from "~/components/quiet-link";
import { Check, ChevronLeft, CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIsMobile } from "~/hooks/use-mobile";
import { isHistory, isOpenIncident, isPlanned } from "../system-health.model";
import { formatHealthTimestamp } from "../system-health.utils";
import type { HealthEvent, SystemHealthDashboard } from "../system-admin.types";

const AUDIT_SEARCH = {
  page: 1,
  actor: undefined,
  event: undefined,
  source: "system",
  from: undefined,
  to: undefined,
  account: undefined,
} as const;

function ActiveIncident({
  event,
  canManage,
  pending,
  hotkeyLabel,
  onAcknowledge,
  onRecordMaintenance,
}: {
  event: HealthEvent;
  canManage: boolean;
  pending: boolean;
  hotkeyLabel: (hotkey: string) => string;
  onAcknowledge: (eventId: string) => void;
  onRecordMaintenance: () => void;
}) {
  return (
    <li className="health-active-incident flex flex-col gap-2 rounded-xl bg-health-warning-bg p-3.5 text-health-warning-fg">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{event.title}</p>
          <p className="text-sm text-pretty text-foreground/80">{event.summary}</p>
          <p className="text-sm text-muted-foreground">
            Affected component: {event.component} · Started{" "}
            <time dateTime={event.startedAt}>{formatHealthTimestamp(event.startedAt)}</time>
          </p>
        </div>
      </div>
      {event.acknowledgedAt ? (
        <Badge variant="neutral" className="ml-6.5 h-auto gap-1.5 py-1 whitespace-normal">
          <Check aria-hidden="true" />
          Acknowledged{event.acknowledgedByName ? ` by ${event.acknowledgedByName}` : ""} ·{" "}
          {formatHealthTimestamp(event.acknowledgedAt)}
        </Badge>
      ) : canManage ? (
        <div className="ml-6.5 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRecordMaintenance}>
            Record Maintenance
            <Kbd aria-hidden="true">{hotkeyLabel("M")}</Kbd>
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onAcknowledge(event.id)}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Acknowledge
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function StoppedMonitor({ minutes, onCheckNow, pending, canManage }: { minutes: number | null; onCheckNow: () => void; pending: boolean; canManage: boolean }) {
  return (
    <li className="health-active-incident flex flex-col gap-2 rounded-xl bg-health-warning-bg p-3.5 text-health-warning-fg">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">Scheduled checks have stopped</p>
          <p className="text-sm text-pretty text-foreground/80">
            {minutes === null ? "No run recorded." : `No run for ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`} The page is showing
            the last results.
          </p>
          <p className="text-sm text-muted-foreground">Affected component: Scheduled checks</p>
        </div>
      </div>
      {canManage ? (
        <Button type="button" size="sm" variant="outline" className="ml-6.5 self-start" disabled={pending} onClick={onCheckNow}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Check Now
        </Button>
      ) : null}
    </li>
  );
}

function EventRow({ event, planned = false }: { event: HealthEvent; planned?: boolean }) {
  const recovered = event.type === "recovery";
  const maintenance = event.type === "maintenance";
  const tone = recovered ? "success" : maintenance ? "info" : "warning";
  return (
    <li className="health-event-row">
      <span className="health-event-dot" data-tone={tone} aria-hidden="true" />
      <div className="health-event-copy">
        <div><strong title={event.title}>{event.title}</strong><span className="health-event-badge" data-tone={tone}>{recovered ? "Recovered" : maintenance ? planned ? "Planned" : "Done" : "Resolved"}</span></div>
        {event.summary ? <p title={event.summary}>{event.summary}</p> : null}
        {maintenance && event.plannedEnd ? <p>{event.component} &middot; until {formatHealthTimestamp(event.plannedEnd)}</p> : null}
      </div>
      <time dateTime={event.startedAt}>{formatHealthTimestamp(event.startedAt)}</time>
    </li>
  );
}

function QuietEmpty({ icon: Icon, title, description, children }: { icon: typeof CircleCheck; title: string; description: string; children?: ReactNode }) {
  return <div className="health-incident-empty-state">
    <span className="health-empty-icon" data-tone={Icon === CircleCheck ? "success" : "info"}><Icon aria-hidden="true" /></span>
    <h3>{title}</h3><p>{description}</p>{children}
  </div>;
}

type IncidentTab = "active" | "history" | "planned";

export function HealthIncidentsCard({ data, pending, hotkeyLabel, onAcknowledge, onRecordMaintenance, onCheckNow }: {
  data: SystemHealthDashboard;
  pending: "acknowledge" | "check" | "maintenance" | "limits" | "alerts" | null;
  hotkeyLabel: (hotkey: string) => string;
  onAcknowledge: (eventId: string) => void;
  onRecordMaintenance: () => void;
  onCheckNow: () => void;
}) {
  const [tab, setTab] = useState<IncidentTab>("active");
  const [pages, setPages] = useState({ active: 0, history: 0, planned: 0 });
  const isMobile = useIsMobile();
  const open = data.events.filter(isOpenIncident);
  const history = data.events.filter((event) => isHistory(event, data.now));
  const planned = data.events.filter((event) => isPlanned(event, data.now));
  const monitorStopped = data.monitor.status === "degraded";
  const activeRows = [
    ...(monitorStopped ? [<StoppedMonitor key="monitor" minutes={data.monitor.minutesSinceLastRun} onCheckNow={onCheckNow} pending={pending === "check"} canManage={data.canManage} />] : []),
    ...open.map((event) => <ActiveIncident key={event.id} event={event} canManage={data.canManage} pending={pending === "acknowledge"} hotkeyLabel={hotkeyLabel} onAcknowledge={onAcknowledge} onRecordMaintenance={onRecordMaintenance} />),
  ];
  const counts = { active: activeRows.length, history: history.length, planned: planned.length };
  const pageSize = tab === "active" ? 2 : isMobile ? 3 : 6;
  const total = counts[tab];
  const page = Math.min(pages[tab], Math.max(0, Math.ceil(total / pageSize) - 1));
  const start = page * pageSize;
  const end = Math.min(total, start + pageSize);

  return (
    <section className="health-incidents-content">
      <Tabs value={tab} onValueChange={(value) => { if (value === "active" || value === "history" || value === "planned") setTab(value); }}>
        <TabsList className="health-incident-tabs" aria-label="Incidents">
          {([["active", "Active"], ["history", "History"], ["planned", "Planned"]] as const).map(([value, label]) => <TabsTrigger key={value} value={value}>{label}<span className="health-incident-count">{counts[value]}</span></TabsTrigger>)}
        </TabsList>
        <TabsContent value="active">
          {activeRows.length ? <ul className="health-active-incident-list">{activeRows.slice(start, end)}</ul> : <QuietEmpty icon={CircleCheck} title="No active incidents" description={data.checkedAt ? `Last check ${formatHealthTimestamp(data.checkedAt)}.` : "No checks have run yet."} />}
        </TabsContent>
        <TabsContent value="history">
          {history.length ? <ul className="health-event-list">{history.slice(start, end).map((event) => <EventRow key={event.id} event={event} />)}</ul> : <QuietEmpty icon={Clock} title="No recent incidents" description="Slow spells, recoveries and finished maintenance from the last 7 days appear here." />}
        </TabsContent>
        <TabsContent value="planned">
          {planned.length ? <ul className="health-event-list">{planned.slice(start, end).map((event) => <EventRow key={event.id} event={event} planned />)}</ul> : <QuietEmpty icon={Clock} title="No planned maintenance" description="Record a window so planned work does not read as an incident.">{data.canManage ? <Button type="button" size="sm" onClick={onRecordMaintenance}>Record maintenance</Button> : null}</QuietEmpty>}
        </TabsContent>
      </Tabs>
      <footer className="health-incident-footer">
        {total > 0 ? <p>Showing {start + 1}&ndash;{end} of {total}</p> : <span />}
        <div className="health-incident-footer-actions">
          {page > 0 ? <Button type="button" size="sm" variant="outline" aria-label="Previous incidents" onClick={() => setPages((previous) => ({ ...previous, [tab]: page - 1 }))}><ChevronLeft aria-hidden="true" /></Button> : null}
          {end < total ? <Button type="button" size="sm" variant="outline" onClick={() => setPages((previous) => ({ ...previous, [tab]: page + 1 }))}>Show more</Button> : null}
          <Link to="/system-admin/audit" search={AUDIT_SEARCH} className="health-dialog-link" title={`Open Audit Center (${hotkeyLabel("A")})`}>Open Audit Center</Link>
        </div>
      </footer>
    </section>
  );
}
