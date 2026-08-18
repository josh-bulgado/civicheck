import type { HealthStatus } from "./system-admin.types";

export const healthStatusContent: Record<
  HealthStatus,
  { label: string; className: string; dotClassName: string }
> = {
  operational: {
    label: "Operational",
    className: "status-success",
    dotClassName: "bg-health-success-dot",
  },
  degraded: {
    label: "Degraded",
    className: "status-warning",
    dotClassName: "bg-health-warning-dot",
  },
  outage: {
    label: "Outage",
    className: "status-error",
    dotClassName: "bg-health-error-dot",
  },
  unknown: {
    label: "Unknown",
    className: "status-neutral",
    dotClassName: "bg-health-neutral-dot",
  },
};

export const healthDataSources = [
  {
    signal: "Database",
    source: "Metadata-only profiles availability probe",
    refresh: "On dashboard refresh",
    owner: "Platform operations",
    exposure: "Availability and response time only",
  },
  {
    signal: "Authentication",
    source: "Supabase Auth administrative availability probe",
    refresh: "On dashboard refresh",
    owner: "Identity operations",
    exposure: "Availability and response time only",
  },
  {
    signal: "Document storage",
    source: "Bucket probe and aggregate storage RPC",
    refresh: "On dashboard refresh",
    owner: "Platform operations",
    exposure: "Object count and total bytes only",
  },
  {
    signal: "Background jobs",
    source: "Metadata-only job run records",
    refresh: "Written by each job runner",
    owner: "Platform engineering",
    exposure: "Job key, state, retry count, and failure code",
  },
  {
    signal: "Request workflow",
    source: "Staff-owned request stage timestamps",
    refresh: "On dashboard refresh",
    owner: "CCRO operations",
    exposure: "Aggregate stale-record count only",
  },
] as const;
