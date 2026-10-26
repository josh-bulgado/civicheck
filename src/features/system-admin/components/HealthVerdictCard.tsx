import { ChartNoAxesColumnIncreasing, ChevronRight, CircleDashed, ClipboardList, ShieldCheck, Timer, TriangleAlert } from "lucide-react";
import { healthVerdict } from "../system-health.model";
import { formatHealthPercent, formatResponseTime } from "../system-health.utils";
import { healthStatusContent } from "../system-health.constants";
import type { SystemHealthDashboard } from "../system-admin.types";
import { HealthBars } from "./HealthCharts";

export function HealthVerdictCard({ data, onShowIncidents }: { data: SystemHealthDashboard; onShowIncidents: () => void }) {
  const verdict = healthVerdict(data);
  const tone = data.overallStatus === "operational" ? "ok" : data.overallStatus === "unknown" ? "neutral" : data.overallStatus === "outage" ? "err" : "warn";
  const affected = data.services.filter((service) => service.status === "degraded" || service.status === "outage").length;
  const Icon = tone === "ok" ? ShieldCheck : tone === "neutral" ? CircleDashed : TriangleAlert;
  const slowest = data.services.find((service) => service.name === data.slowest?.name);
  const allChecks = data.services.flatMap((service) => service.checks).sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className="health-panel health-summary" aria-label="System health summary">
      <button type="button" className={`health-summary-status health-tone-${tone}`} onClick={onShowIncidents} title={verdict.body}>
        <span className="health-metric-icon"><Icon aria-hidden="true" /></span>
        <span className="health-metric-copy" aria-live="polite">
          <span className="health-metric-label">System Status</span>
          <span className="health-metric-value">{healthStatusContent[data.overallStatus].label}<ChevronRight className="size-4 text-health-warning-dot" aria-hidden="true" /></span>
          <span className="health-status-track" aria-hidden="true">
            {data.services.map((service) => <span key={service.key} data-status={service.status} />)}
            <span data-status={data.monitor.status} />
          </span>
          <span className="health-metric-note">{data.checkedAt ? affected ? `${affected} of ${data.services.length} services affected` : data.activeCount ? verdict.title : "All services are running smoothly" : "Waiting for the first check"}</span>
          <span className="sr-only">{verdict.body}</span>
        </span>
      </button>
      <div className="health-summary-metric">
        <span className="health-metric-icon health-icon-blue"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>
        <div className="health-metric-copy">
          <span className="health-metric-label">Availability</span>
          <strong className="health-metric-value">{data.availabilityPercent === null ? "—" : formatHealthPercent(data.availabilityPercent)}</strong>
          <span className="health-metric-note">Over the last 24 hours</span>
        </div>
        <HealthBars checks={allChecks} availability className="health-summary-bars" color="var(--health-info-dot)" />
      </div>
      <div className="health-summary-metric">
        <span className="health-metric-icon health-icon-violet"><Timer aria-hidden="true" /></span>
        <div className="health-metric-copy">
          <span className="health-metric-label">Response Time</span>
          <strong className="health-metric-value">{data.slowest ? formatResponseTime(data.slowest.responseMs) : "—"}</strong>
          <span className="health-metric-note">{data.slowest ? `Slowest: ${data.slowest.name}` : "No checks yet"}</span>
        </div>
        <HealthBars checks={slowest?.checks ?? []} className="health-summary-bars" color="var(--health-success-dot)" />
      </div>
      <button type="button" className="health-summary-metric health-summary-incidents" onClick={onShowIncidents}>
        <span className="health-metric-icon health-icon-green"><ClipboardList aria-hidden="true" /></span>
        <span className="health-metric-copy">
          <span className="health-metric-label">Active Incidents</span>
          <strong className="health-metric-value">{data.activeCount}</strong>
        </span>
        <ChevronRight className="ml-auto size-5 text-muted-foreground" aria-hidden="true" />
      </button>
    </section>
  );
}
