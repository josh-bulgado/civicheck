import { CircleDashed, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { healthVerdict } from "../system-health.model";
import { formatHealthPercent, formatResponseTime } from "../system-health.utils";
import { healthStatusContent } from "../system-health.constants";
import type { SystemHealthDashboard } from "../system-admin.types";
import { consecutiveFailedChecks, healthStatusHistory } from "../system-health-history.model";
import { HealthStatusHistory } from "./HealthStatusHistory";
import { HealthSummaryAvailability, HealthSummaryIncidents, HealthSummaryResponse } from "./HealthSummaryVisuals";

export function HealthVerdictCard({ data, onShowIncidents }: { data: SystemHealthDashboard; onShowIncidents: () => void }) {
  const verdict = healthVerdict(data);
  const tone = data.overallStatus === "outage" ? "err" : verdict.tone;
  const Icon = tone === "ok" ? ShieldCheck : tone === "neutral" ? CircleDashed : TriangleAlert;
  const troubled = data.services.filter((service) => service.status === "degraded" || service.status === "outage");
  const slowService = troubled.length === 1 && troubled[0].outcome === "slow" && data.monitor.status !== "degraded" ? troubled[0] : null;
  const failedService = data.services.find((service) => service.outcome === "failed");
  const responseService = failedService ?? data.services.find((service) => service.name === data.slowest?.name) ?? null;
  const intervals = useMemo(() => healthStatusHistory(data.services, data.now), [data.services, data.now]);
  const failureCount = failedService ? consecutiveFailedChecks(failedService.checks) : 0;
  const answered = data.services.filter((service) => service.status === "operational").map((service) => service.name);
  const failureDescription = `${failureCount > 1 ? `The last ${failureCount} checks timed out.` : "The last check timed out."}${answered.length ? ` ${answered.join(" and ")} still ${answered.length === 1 ? "answers" : "answer"}.` : ""}`;
  const title = verdict.title.charAt(0) + verdict.title.slice(1).toLowerCase();
  const description = failedService && troubled.length === 1 && data.monitor.status !== "degraded" ? failureDescription : slowService
    ? `It took ${formatResponseTime(slowService.responseMs)} on its last check, over the ${formatResponseTime(slowService.slowAfterMs)} limit.`
    : tone === "ok" ? "Everything answered the last check." : verdict.body;

  return (
    <section className={`health-panel health-summary health-tone-${tone}`} aria-label="System health summary">
      <button type="button" className="health-summary-status" onClick={onShowIncidents} title={verdict.body}>
        <span className="health-metric-icon"><Icon aria-hidden="true" /></span>
        <span className="health-metric-copy" aria-live="polite">
          <span className="health-verdict-badge">{data.overallStatus === "outage" ? "Failed" : healthStatusContent[data.overallStatus].label}</span>
          <strong className="health-verdict-title">{title}</strong>
          <span className="health-verdict-description">{description}</span>
        </span>
      </button>
      <div className="health-summary-metric">
        <span className="health-metric-label">Availability</span>
        <strong className="health-metric-value">{data.availabilityPercent === null ? "—" : formatHealthPercent(data.availabilityPercent)}</strong>
        <HealthSummaryAvailability intervals={intervals} />
        <span className="health-metric-note health-summary-fallback">Last 24 hours</span>
      </div>
      <div className="health-summary-metric">
        <span className="health-metric-label">Response time</span>
        <strong className="health-metric-value" data-failed={!!failedService || undefined}>{failedService ? "Timed out" : data.slowest ? <>{formatResponseTime(data.slowest.responseMs).replace(/ ms$/, "")}<span className="health-metric-unit">ms</span></> : "—"}</strong>
        <HealthSummaryResponse intervals={intervals} service={responseService} failed={!!failedService} />
        <span className="health-metric-note health-summary-fallback">{failedService ? failedService.name : data.slowest ? `Slowest: ${data.slowest.name}` : "No checks yet"}</span>
      </div>
      <button type="button" className="health-summary-metric health-summary-incidents" onClick={onShowIncidents} aria-label={`${data.activeCount} active incidents. Review system incidents.`}>
        <span className="health-metric-label">Active incidents</span>
        <strong className="health-metric-value">{data.activeCount}</strong>
        <HealthSummaryIncidents events={data.events} now={data.now} />
        <span className="health-metric-note health-summary-fallback">Tap to review</span>
      </button>
      <HealthStatusHistory intervals={intervals} />
    </section>
  );
}
