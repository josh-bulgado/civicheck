import type { ReactNode } from "react";
import { QuietLink as Link } from "~/components/quiet-link";
import { ArrowUpRight, Check, CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Kbd } from "~/components/ui/kbd";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
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
    <li className="flex flex-col gap-2 rounded-xl bg-health-warning-bg p-3.5 text-health-warning-fg">
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
    <li className="flex flex-col gap-2 rounded-xl bg-health-warning-bg p-3.5 text-health-warning-fg">
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

/** `planned` marks a window that has not ended; in History a maintenance row is finished. */
function EventRow({ event, planned = false }: { event: HealthEvent; planned?: boolean }) {
  const recovered = event.type === "recovery";
  const maintenance = event.type === "maintenance";
  return (
    <li className="flex gap-3 border-t border-border/60 py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2.5 shrink-0",
          recovered ? "rounded-full bg-health-success-dot" : maintenance ? "rounded-full bg-health-neutral-dot" : "rotate-45 rounded-[2px] bg-health-warning-dot",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold">{event.title}</p>
          <Badge variant="neutral">{recovered ? "Recovered" : maintenance ? (planned ? "Planned" : "Done") : "Resolved"}</Badge>
        </div>
        {event.summary ? <p className="text-sm text-pretty text-muted-foreground">{event.summary}</p> : null}
        {maintenance && event.plannedEnd ? (
          <p className="text-sm text-muted-foreground">{event.component} · until {formatHealthTimestamp(event.plannedEnd)}</p>
        ) : null}
      </div>
      <time dateTime={event.startedAt} className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatHealthTimestamp(event.startedAt)}
      </time>
    </li>
  );
}

function QuietEmpty({ icon: Icon, title, description, children }: { icon: typeof CircleCheck; title: string; description: string; children?: ReactNode }) {
  return (
    <Empty className="border-0 p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}

/** Active, History and Planned in one card. */
export function HealthIncidentsCard({
  data,
  pending,
  hotkeyLabel,
  onAcknowledge,
  onRecordMaintenance,
  onCheckNow,
}: {
  data: SystemHealthDashboard;
  pending: "acknowledge" | "check" | "maintenance" | "limits" | "alerts" | null;
  hotkeyLabel: (hotkey: string) => string;
  onAcknowledge: (eventId: string) => void;
  onRecordMaintenance: () => void;
  onCheckNow: () => void;
}) {
  const open = data.events.filter(isOpenIncident);
  const history = data.events.filter((event) => isHistory(event, data.now));
  const planned = data.events.filter((event) => isPlanned(event, data.now));
  const monitorStopped = data.monitor.status === "degraded";
  const activeCount = open.length + (monitorStopped ? 1 : 0);

  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <Tabs defaultValue="active">
        <TabsList variant="counted" aria-label="Incidents" className="px-3">
          <TabsTrigger value="active">
            Active
            <TabsCount tone={activeCount > 0 ? "alert" : "default"}>{activeCount}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="history">
            History
            <TabsCount>{history.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="planned">
            Planned
            <TabsCount>{planned.length}</TabsCount>
          </TabsTrigger>
        </TabsList>
        <CardContent className="px-4 py-3">
          <TabsContent value="active">
            {activeCount === 0 ? (
              <QuietEmpty
                icon={CircleCheck}
                title="No Active Incidents"
                description={data.checkedAt ? `Last check ${formatHealthTimestamp(data.checkedAt)}. Nothing needs review.` : "No checks have run yet."}
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {monitorStopped ? (
                  <StoppedMonitor
                    minutes={data.monitor.minutesSinceLastRun}
                    onCheckNow={onCheckNow}
                    pending={pending === "check"}
                    canManage={data.canManage}
                  />
                ) : null}
                {open.map((event) => (
                  <ActiveIncident
                    key={event.id}
                    event={event}
                    canManage={data.canManage}
                    pending={pending === "acknowledge"}
                    hotkeyLabel={hotkeyLabel}
                    onAcknowledge={onAcknowledge}
                    onRecordMaintenance={onRecordMaintenance}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="history">
            {history.length === 0 ? (
              <QuietEmpty icon={Clock} title="No Recent Incidents" description="Slow spells, recoveries and finished maintenance from the last 7 days appear here." />
            ) : (
              <ul>
                {history.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="planned">
            {planned.length === 0 ? (
              <QuietEmpty icon={Clock} title="No Planned Maintenance" description="Record a window so planned work does not read as an incident.">
                {data.canManage ? (
                  <Button type="button" size="sm" variant="outline" onClick={onRecordMaintenance}>
                    Record Maintenance
                    <Kbd aria-hidden="true">{hotkeyLabel("M")}</Kbd>
                  </Button>
                ) : null}
              </QuietEmpty>
            ) : (
              <ul>
                {planned.map((event) => (
                  <EventRow key={event.id} event={event} planned />
                ))}
              </ul>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      <Link
        to="/system-admin/audit"
        search={AUDIT_SEARCH}
        aria-label="Open Audit Center filtered to system events"
        className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-sm font-semibold text-primary outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="inline-flex items-center gap-2">
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Open Audit Center
        </span>
        <Kbd aria-hidden="true">{hotkeyLabel("A")}</Kbd>
      </Link>
    </Card>
  );
}
