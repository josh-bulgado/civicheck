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

/** How long checks are kept. The nightly prune in the database must match. */
export const HEALTH_RETENTION_DAYS = 30;

/**
 * What this page records, what it never does, and who sees it. The first list is what the
 * checks write; the second is the promise that makes the page safe to show.
 */
export const privacyBoundary = {
  recorded: [
    "Availability and response time of the database, sign-in and document storage",
    "Object count and total size of stored documents",
    "The result of each check run: succeeded, failed, retries",
    "Incident titles with a short, redacted summary",
  ],
  never: [
    "Citizen form values or request remarks",
    "Document names, paths or contents",
    "Any request record, count or timestamp",
    "Passwords, tokens or other secrets",
  ],
  access: [
    "Active system administrators only, enforced in the database",
    `Kept for ${HEALTH_RETENTION_DAYS} days, then deleted automatically`,
    "Changes to limits, maintenance and alerts are written to the Audit Center",
  ],
} as const;
