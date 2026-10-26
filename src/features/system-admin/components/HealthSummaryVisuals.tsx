import type { HealthEvent, ServiceHealth } from "../system-admin.types";
import type { HealthHistoryInterval } from "../system-health-history.model";
import { healthSummaryAvailability, healthSummaryIncidents, healthSummaryResponse } from "../system-health-summary.model";
import { countLabel, formatHealthPercent, formatHealthTimestamp, formatResponseTime } from "../system-health.utils";

export function HealthSummaryAvailability({ intervals }: { intervals: HealthHistoryInterval[] }) {
  const bars = healthSummaryAvailability(intervals);
  return (
    <span className="health-summary-visual">
      <span className="health-mini-availability" role="img" aria-label="Hourly successful check share over the last 24 hours. Green passed, yellow slow, red failed, grey missing readings.">
        {bars.map((bar) => <span key={bar.from} data-outcome={bar.status} style={{ height: bar.percent === null ? "20%" : `${bar.percent}%` }} title={`${formatHealthTimestamp(bar.from)}: ${bar.percent === null ? "No checks recorded" : `${formatHealthPercent(bar.percent)} of recorded checks passed (${bar.passed} of ${bar.checks})`}`} />)}
      </span>
      <span className="health-mini-axis"><span>24 h ago</span><span>Now</span></span>
    </span>
  );
}

export function HealthSummaryResponse({ intervals, service, failed }: { intervals: HealthHistoryInterval[]; service: ServiceHealth | null; failed: boolean }) {
  const plot = healthSummaryResponse(intervals, service);
  return (
    <span className="health-summary-visual">
      <span className="health-mini-response">
        {plot.segments.length ? <svg viewBox="0 0 240 48" preserveAspectRatio="none" role="img" aria-label={`${service?.name ?? "Service"} response time over the last 24 hours. Dashed line: ${plot.limitMs === null ? "limit not set" : formatResponseTime(plot.limitMs)}. Gaps mark failed or missing checks.`}>
          {plot.limitY !== null ? <path className="health-mini-limit" d={`M0,${plot.limitY} H240`} /> : null}
          {plot.segments.map((segment, index) => <g key={index}><path className="health-mini-response-area" d={segment.area} /><path className="health-mini-response-line" d={segment.line} /></g>)}
        </svg> : <span className="health-mini-empty">No response readings</span>}
      </span>
      <span className="health-mini-axis"><span title={service?.name}>{service ? `${failed ? "Failed" : "Slowest"}: ${service.name}` : "No checks yet"}</span>{plot.limitMs !== null ? <span className="health-mini-limit-label">Limit {formatResponseTime(plot.limitMs)}</span> : null}</span>
    </span>
  );
}

const dayFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

export function HealthSummaryIncidents({ events, now }: { events: HealthEvent[]; now: string }) {
  const days = healthSummaryIncidents(events, now);
  return (
    <span className="health-summary-visual">
      <span className="health-mini-incidents" role="img" aria-label="Recorded incidents over the last seven Philippine calendar days. Pale green: none recorded. Yellow: incident. Red: critical incident.">
        {days.map((day) => <span key={day.from} data-tone={day.tone} title={`${dayFormatter.format(new Date(day.from))}: ${countLabel(day.count, "recorded incident")}`} />)}
      </span>
      <span className="health-mini-axis"><span>Last 7 days</span><span>Today</span></span>
    </span>
  );
}
