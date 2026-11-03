import { CheckCheck, TriangleAlert } from "lucide-react";
import { isOpenIncident } from "../system-health.model";
import { formatHealthTimestamp, healthTimeAgo } from "../system-health.utils";
import type { SystemHealthDashboard } from "../system-admin.types";
import { HealthSparkline } from "./HealthCharts";
import { HealthStatusBadge } from "./HealthStatusBadge";

export function HealthActiveIncidents({ data, onViewAll }: { data: SystemHealthDashboard; onViewAll: () => void }) {
  const incidents = data.events.filter(isOpenIncident);
  return (
    <section className="health-panel health-incidents" aria-labelledby="active-incidents-title">
      <div className="health-card-heading"><h2 id="active-incidents-title">Active Incidents</h2><button type="button" className="health-text-action" onClick={onViewAll}>View All</button></div>
      <div className="health-incident-list">
        {data.monitor.status === "degraded" ? <button type="button" className="health-incident" onClick={onViewAll}><span className="health-incident-icon"><TriangleAlert aria-hidden="true" /></span><span className="health-incident-copy"><strong>Scheduled checks need attention</strong><HealthStatusBadge status="degraded" /></span></button> : null}
        {incidents.slice(0, 2).map((event) => {
          const service = data.services.find((item) => item.key === event.componentKey);
          const status = event.severity === "critical" ? "outage" : "degraded";
          return (
            <button type="button" key={event.id} className="health-incident" data-critical={status === "outage" || undefined} onClick={onViewAll}>
              <span className="health-incident-icon"><TriangleAlert aria-hidden="true" /></span>
              <span className="health-incident-copy"><strong>{event.title}</strong><HealthStatusBadge status={status} /></span>
              {service ? <HealthSparkline checks={service.checks} status={status} /> : null}
              
            </button>
          );
        })}
        {data.activeCount === 0 ? <div className="health-incident-empty"><CheckCheck className="size-7 text-health-success-dot" aria-hidden="true" /><div><strong>No active incidents</strong><p>{data.checkedAt ? "Everything is looking good." : "Run a check to see your system status."}</p></div></div> : null}
      </div>
    </section>
  );
}

export function HealthRecentActivity({ data, onViewAll }: { data: SystemHealthDashboard; onViewAll: () => void }) {
  const entries = [
    ...data.events.filter((event) => event.startedAt <= data.now).map((event) => ({ id: event.id, title: event.title, at: event.startedAt, tone: event.type === "degradation" ? event.severity === "critical" ? "error" : "warning" : event.type === "recovery" ? "success" : "info" })),
    ...(data.checkedAt ? [{ id: "check", title: "Component check completed", at: data.checkedAt, tone: "success" }] : []),
    ...(data.monitor.lastRunAt ? [{ id: "monitor", title: data.monitor.lastRunSucceeded ? "Scheduled check completed" : "Scheduled check failed", at: data.monitor.lastRunAt, tone: data.monitor.lastRunSucceeded ? "success" : "warning" }] : []),
    ...(data.lastManualCheckAt ? [{ id: "manual", title: "Manual health check recorded", at: data.lastManualCheckAt, tone: "info" }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  return (
    <section className="health-panel health-activity" aria-labelledby="recent-activity-title">
      <div className="health-card-heading"><h2 id="recent-activity-title">Recent activity</h2><button type="button" className="health-text-action" onClick={onViewAll}>View all</button></div>
      {entries.length ? <ol className="health-activity-list">{entries.map((entry) => <li key={entry.id}><span className="health-activity-dot" style={{ background: `var(--health-${entry.tone}-dot)` }} aria-hidden="true" /><span className="health-activity-title" title={entry.title}>{entry.title}</span><time dateTime={entry.at} title={formatHealthTimestamp(entry.at)}>{healthTimeAgo(entry.at, data.now)}</time></li>)}</ol> : <p className="health-activity-empty">Activity will appear after the first system check.</p>}
    </section>
  );
}

