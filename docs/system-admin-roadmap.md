# System Administrator Roadmap

This roadmap defines capabilities that extend the system administrator role beyond Accounts and the Audit Center. Sections are proposed product direction unless they are explicitly marked as implemented.

## Guiding Privacy Boundary

System administrators should receive only the operational metadata needed to keep the platform reliable, secure, and recoverable. They must not be able to view citizen submission contents, uploaded documents, or other protected case data. New administrative capabilities should preserve this boundary through least-privilege access, data minimization, and auditable actions.

## Prioritized Capability Areas

### 1. System Health Dashboard

**MVP implementation status: Implemented.** The dashboard is available to active System Administrators at `/system-admin/health`. It uses a permission-protected server function and metadata-only telemetry tables introduced by `20260816120000_add_system_health_dashboard.sql`.

Provide a single operational view of platform availability and service health.

- Display service status, uptime trends, error rates, and response-time indicators.
- Surface queue backlogs, failed background jobs, storage capacity signals, and other operational bottlenecks.
- Highlight active degradations and recent recoveries with timestamps and affected components.
- Offer drill-down views based on aggregate or redacted telemetry, without exposing citizen submissions or documents.
- Link health signals to relevant incidents, maintenance events, and administrative actions.

#### Implemented MVP indicators

| Indicator | Data source | Update frequency | Operational owner | Acceptable exposure |
|---|---|---|---|---|
| Core database | Metadata-only profile availability probe | On dashboard refresh; 30-second route freshness window | Platform operations | Status and response time |
| Authentication | Supabase Auth administrative availability probe | On dashboard refresh; 30-second route freshness window | Identity operations | Status and response time |
| Document storage | Bucket availability probe and aggregate storage RPC | On dashboard refresh; 30-second route freshness window | Platform operations | Object count and total bytes only |
| Counter queue | Current-day queue status timestamps | On dashboard refresh | CCRO operations | Waiting count and oldest wait only |
| Background jobs | Metadata-only job run records written by job runners | On job completion | Platform engineering | Job key, status, retry count, and failure code |
| Request workflow | Status and update timestamps for staff-owned workflow stages | On dashboard refresh | CCRO operations | Aggregate count of records unchanged for 48 hours |

Service checks are retained as aggregate snapshots for 24-hour availability, error-rate, and response-time trends. Operational events support active degradations, recoveries, maintenance windows, and optional audit-event links. The telemetry schema explicitly excludes request bodies, citizen form values, document names and paths, job payloads, and authentication secrets.

### 2. Security Center

**MVP implementation status: Implemented.** The Security Center is available to active System Administrators at `/system-admin/security`. Permission-protected server functions and metadata-only security tables are introduced by `20260816130000_add_security_center.sql`.

Centralize security posture, access-risk signals, and administrator safeguards.

- Summarize authentication anomalies, elevated-risk access attempts, and administrator session activity.
- Support review of roles, permissions, privileged accounts, and stale access assignments.
- Track security policy status, credential rotation reminders, and other configurable controls.
- Provide workflows for acknowledging, assigning, and resolving security findings.
- Record sensitive administrative actions in the Audit Center while keeping protected citizen data out of security views.

#### Implemented MVP safeguards and signals

| Capability | Data source | Workflow | Acceptable exposure |
|---|---|---|---|
| Authentication anomalies | Redacted sign-in failure events; optional server-side HMAC fingerprint for repeat detection | Repeated failures create reviewable findings | Event type, risk, time, and pseudonymous grouping only |
| Administrator sessions | Successful CCRO and System Administrator sign-ins | Recent activity review | Administrator profile label and session start time |
| Privileged access review | Active System Administrator, CCRO Administrator, and Supervisor profiles plus Auth sign-in timestamps | Accounts inactive for the review window create findings | Role, account status, creation time, and last sign-in only |
| Security findings | Metadata-only finding register | Acknowledge, assign, and resolve with a required resolution note | Security summaries and administrative profile references only |
| Policy controls | Configurable control register and review cadence | Record a completed review and calculate the next due date | Status, evidence summary, interval, and dates; never secret values |
| Audit linkage | Append-only system audit events | Finding and control actions are recorded automatically | Actor, event type, target administrator when applicable, and finding/control identifier |

The login path deliberately excludes raw email addresses and network addresses from Security Center telemetry. If `SECURITY_EVENT_HASH_SECRET` is configured, rejected attempts can be grouped with a one-way HMAC fingerprint; the fingerprint itself is not displayed. Findings, event summaries, and resolution notes must never contain citizen submissions, case data, document metadata, tokens, or credentials.

### 3. Integrations & Notifications

Manage operational connections and ensure that the right teams receive actionable alerts.

- Configure supported email, messaging, webhook, and monitoring destinations.
- Define notification rules by severity, event type, recipient group, and escalation path.
- Show connection health, delivery status, recent failures, and retry history.
- Allow safe test notifications using synthetic content only.
- Protect secrets through masked values, restricted access, and auditable configuration changes.

### 4. Platform Configuration

Provide controlled management of settings that affect platform-wide behavior.

- Organize configuration by environment and functional area with clear descriptions and defaults.
- Validate changes before activation and identify dependencies or potential impact.
- Require confirmation or approval for high-risk changes.
- Maintain version history and support rollback to a known configuration state.
- Separate operational settings from citizen content and case-management permissions.

### 5. Data Governance & Recovery

Enable administrators to manage data lifecycle and resilience without accessing protected content.

- Define retention, archival, and deletion policies by data classification.
- Report aggregate storage usage, retention-policy coverage, and pending lifecycle actions.
- Track backup status, recovery points, verification results, and restoration readiness.
- Support scoped recovery workflows with approvals, progress tracking, and audit records.
- Expose metadata about recovery operations while preventing administrators from browsing restored citizen submissions or documents.

### 6. Incident Center

Coordinate the operational response to outages, degradations, and security events.

- Create incidents from health or security signals and classify them by severity and impact.
- Assign owners, track response milestones, and maintain an event timeline.
- Coordinate internal updates and approved service-status communications.
- Associate incidents with affected components, configuration changes, and remediation tasks.
- Capture post-incident findings and follow-up actions without including protected citizen content.

### 7. System Administrator Recovery

Provide a secure path to restore administrative access when normal account recovery is unavailable.

- Establish a documented break-glass process with strong identity verification and limited eligibility.
- Require multiple authorized participants or equivalent safeguards for critical recovery actions.
- Issue time-limited recovery access with narrowly scoped permissions.
- Notify designated security contacts and record every recovery step in the audit trail.
- Require credential reset, session review, and post-recovery approval before returning the account to normal use.

## Recommended Delivery Sequence

### MVP: System Health Dashboard

Begin with the System Health Dashboard because it gives administrators immediate visibility into platform reliability and creates a shared operational foundation for later alerting and incident workflows. The MVP should focus on a concise service-status overview, a small set of trustworthy health indicators, recent operational events, and privacy-safe drill-downs.

Before implementation, define each indicator's data source, update frequency, ownership, and acceptable exposure. Instrumentation should be designed so that displayed telemetry cannot reveal citizen submission contents or documents.

### Future Phases

After validating the dashboard and its underlying operational telemetry, deliver the remaining areas incrementally:

1. Add the Security Center and Integrations & Notifications to turn trusted signals into governed alerts and response workflows.
2. Introduce Platform Configuration with validation, approvals, history, and rollback safeguards.
3. Establish Data Governance & Recovery policies and evidence before enabling recovery operations.
4. Build the Incident Center on top of health, security, and notification foundations.
5. Complete System Administrator Recovery after the required identity, approval, notification, and auditing controls are in place.

Each phase should include explicit privacy review, role and permission design, audit requirements, operational ownership, and measurable acceptance criteria before release.
