import { useId } from "react";
import type { HealthCheck, HealthStatus } from "../system-admin.types";

export function HealthBars({ checks, className = "", color, availability = false }: { checks: HealthCheck[]; className?: string; color?: string; availability?: boolean }) {
  const recent = checks.slice(-16);
  const max = Math.max(1, ...recent.map((check) => check.responseMs ?? 0));
  if (!recent.length) return null;
  const heights = recent.map((check, index) => {
    if (!availability) return check.responseMs === null ? 12 : Math.max(16, (check.responseMs / max) * 100);
    const from = Math.floor(index * checks.length / recent.length);
    const to = Math.floor((index + 1) * checks.length / recent.length);
    const group = checks.slice(from, to);
    return Math.max(8, group.filter((item) => item.outcome === "ok").length / group.length * 100);
  });
  return (
    <span className={`health-bars ${className}`} aria-hidden="true" title={availability ? "Share of successful checks in recent groups of readings" : undefined}>
      {recent.map((check, index) => (
        <span key={`${check.at}-${index}`} style={{
          height: `${heights[index]}%`,
          backgroundColor: color ?? `var(--health-${check.outcome === "failed" ? "error" : check.outcome === "slow" ? "warning" : "success"}-dot)`,
        }} />
      ))}
    </span>
  );
}

/** Failed checks leave gaps, rather than becoming zero-latency readings. */
export function HealthSparkline({ checks, status }: { checks: HealthCheck[]; status: HealthStatus }) {
  const id = useId();
  const recent = checks.slice(-32);
  const values = recent.flatMap((check) => check.responseMs === null ? [] : [check.responseMs]);
  if (!values.length) return <span className="text-muted-foreground">—</span>;
  const max = Math.max(1, ...values) * 1.2;
  const minTime = new Date(recent[0].at).getTime();
  const span = Math.max(1, new Date(recent[recent.length - 1].at).getTime() - minTime);
  const color = `var(--health-${status === "outage" ? "error" : status === "degraded" ? "warning" : "success"}-dot)`;
  let penDown = false;
  const path = recent.map((check) => {
    if (check.responseMs === null) { penDown = false; return ""; }
    const x = 2 + ((new Date(check.at).getTime() - minTime) / span) * 82;
    const y = 31 - (check.responseMs / max) * 27;
    const command = `${penDown ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    penDown = true;
    return command;
  }).join(" ");
  return (
    <svg viewBox="0 0 88 36" className="health-sparkline" role="img" aria-label="Response time trend from recent checks">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity=".02" /></linearGradient></defs>
      {recent.every((check) => check.responseMs !== null) && recent.length > 1 ? <path d={`${path} L84,35 L2,35 Z`} fill={`url(#${id})`} /> : null}
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {recent.length === 1 ? <circle cx="2" cy={31 - (values[0] / max) * 27} r="2" fill={color} /> : null}
    </svg>
  );
}
