import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { HealthHistoryComponent, HealthHistoryInterval, HealthHistoryStatus } from "../system-health-history.model";
import { countLabel, formatHealthClock, formatHealthTimestamp, formatResponseTime } from "../system-health.utils";

const labels: Record<HealthHistoryStatus, string> = { ok: "Passed", slow: "Slow", failed: "Failed", unknown: "No data" };

const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

function intervalTime(interval: HealthHistoryInterval) {
  const from = formatHealthClock(interval.from);
  const to = formatHealthClock(interval.to);
  const period = to.match(/\s[AP]M$/)?.[0];
  return `${period && from.endsWith(period) ? from.slice(0, -period.length) : from} – ${to}`;
}

function responseLabel(component: HealthHistoryComponent) {
  if (component.status === "failed") return "Timed out";
  if (component.status === "unknown") return "No data";
  // The bar represents the worst result, so show its peak measured response.
  return formatResponseTime(component.maxResponseMs);
}

function checkSummary(interval: HealthHistoryInterval) {
  if (!interval.checks) return "No checks recorded";
  const outcomes = interval.passed === interval.checks ? "all passed" : [
    interval.passed ? `${interval.passed} passed` : null,
    interval.slow ? `${interval.slow} slow` : null,
    interval.failed ? `${interval.failed} failed` : null,
  ].filter(Boolean).join(", ");
  return `${countLabel(interval.checks, "check")}, ${outcomes}`;
}

function HistoryDetails({ interval }: { interval: HealthHistoryInterval }) {
  const checkedAt = interval.components.reduce<string | null>((latest, component) => (
    component.lastCheckedAt && (!latest || component.lastCheckedAt > latest) ? component.lastCheckedAt : latest
  ), null);
  return (
    <>
      <div className="health-history-tooltip-heading">
        <div>
          <strong>{intervalTime(interval)}</strong>
          <p>{dateFormatter.format(new Date(interval.from))} &middot; Philippine time</p>
        </div>
        <span className="health-history-tooltip-badge" data-history-status={interval.status}>{labels[interval.status]}</span>
      </div>
      {interval.components.length ? <ul className="health-history-tooltip-components">
        {interval.components.map((component) => <li key={component.key}>
          <span className="health-history-tooltip-component"><span className="health-history-tooltip-dot" data-history-status={component.status} aria-hidden="true" /><strong>{component.name}</strong><span className="sr-only">{labels[component.status]}</span></span>
          <span className="health-history-tooltip-response" data-history-status={component.status === "ok" ? undefined : component.status}>{responseLabel(component)}</span>
        </li>)}
      </ul> : null}
      <p className="health-history-tooltip-summary">{checkedAt ? <>Checked {formatHealthClock(checkedAt)} &middot; </> : null}{checkSummary(interval)}</p>
    </>
  );
}

export function HealthStatusHistory({ intervals }: { intervals: HealthHistoryInterval[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [focusedIndex, setFocusedIndex] = useState(95);
  const states = ["ok", "slow", "failed", "unknown"] as const;
  const counts = states.map((status) => `${intervals.filter((interval) => interval.status === status).length} ${labels[status].toLowerCase()}`);
  const hasGaps = intervals.some((interval) => interval.status === "unknown");

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? intervals.length - 1 : Math.max(0, Math.min(intervals.length - 1, focusedIndex + step));
    setFocusedIndex(next);
    trackRef.current?.querySelector<HTMLButtonElement>(`[data-history-index="${next}"]`)?.focus();
  }
  return (
    <div className="health-status-history">
      <div className="health-history-heading">
        <span>Status, last 24 hours</span>
        <ul className="health-history-legend" aria-label="Status history legend">
          {states.filter((status) => status !== "unknown" || hasGaps).map((status) => <li key={status}><span data-outcome={status} aria-hidden="true" />{labels[status]}</li>)}
        </ul>
      </div>
      <div ref={trackRef} className="health-history-track" role="group" aria-label={`System status in 15-minute intervals over the last 24 hours: ${counts.join(", ")}. Use the left and right arrow keys to browse intervals.`} onKeyDown={moveFocus}>
        {/* Stable positions keep open tooltips mounted during live updates. */}
        {intervals.map((interval, index) => <Tooltip key={index}>
          <TooltipTrigger type="button" className="health-history-bar" data-outcome={interval.status} data-history-index={index} tabIndex={focusedIndex === index ? 0 : -1} onFocus={() => setFocusedIndex(index)} aria-label={`${labels[interval.status]}: ${formatHealthTimestamp(interval.from)} – ${formatHealthClock(interval.to)}`} aria-describedby={`${tooltipId}-${index}`} />
          <TooltipContent id={`${tooltipId}-${index}`} role="tooltip" side="bottom" sideOffset={12} className="health-history-tooltip"><HistoryDetails interval={interval} /></TooltipContent>
        </Tooltip>)}
      </div>
      <div className="health-history-axis" aria-hidden="true">
        {[0, 24, 48, 72].map((index) => <span key={index}>{formatHealthClock(intervals[index].from)}</span>)}<span>Now</span>
      </div>
    </div>
  );
}
