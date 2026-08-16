# CCRO Administrator Roadmap

This roadmap defines the presentation-focused capabilities of the City Civil Registry Office (CCRO) Administrator. It separates citizen-service operations from System Administrator responsibilities, identifies what is already implemented, and prioritizes the work that provides the strongest complete experience within the two-day delivery window.

## Purpose and Role Boundary

The CCRO Administrator owns the day-to-day delivery of citizen-facing services. This includes requests, staff assignments, the service catalog, appointments, queues, and operational reporting.

The System Administrator owns platform health, security, account suspension, privileged access, and technical audits. System Administrators may use aggregate or redacted operational metadata, but they must not be able to view citizen case contents, uploaded documents, or other protected submission data.

New pages and permissions should preserve this separation:

- CCRO Administrators can manage service operations and view the case information required to perform that work.
- System Administrators can maintain the platform without access to citizen request contents.
- Cross-role reporting must expose only the minimum data needed by the receiving role.

## Current Implementation

The following CCRO Administrator modules are already implemented and should remain available throughout the roadmap:

| Module | Implementation status | Current purpose |
|---|---|---|
| Services Registry | Implemented | Manage the citizen services offered by the office and their requirements. |
| Staff management | Implemented | Manage CCRO staff members and their operational assignments. |
| Request Queue | Implemented | Review and process citizen service requests through their workflow stages. |
| Queue Desk | Implemented | Support current-day, counter-based queue operations. |
| Browse Services | Implemented | Preview the services available to citizens; this is a preview utility, not a primary administration function. |

The CCRO Administrator does not currently have a dedicated overview. After sign-in, the role is redirected to the Services Registry, which makes service configuration appear to be the primary daily task and leaves urgent operational work without a summary view.

## Priority Roadmap

### P0 — Must Be Ready for the Presentation

#### 1. CCRO Admin Overview

**Implementation status: Proposed.** Make the overview the default landing page for the CCRO Administrator and present the operational state of the office at a glance.

- Show request counts grouped by workflow stage.
- Highlight incomplete requests that need citizen or staff follow-up.
- Show requests that are ready for release but still unpaid.
- Summarize the current queue, including waiting and actively served citizens.
- Link each summary to the relevant existing operational page when a useful filtered destination is available.
- Calculate all metrics from real application data rather than presentation-only hard-coded values.

#### 2. Basic Reports

**Implementation status: Proposed.** Provide the minimum reporting set required by the project specification.

- Request volume over a clear, presentation-friendly period.
- Processing time for completed or advanced requests, with the calculation and unit stated clearly.
- Incomplete-submission frequency, shown as a count and, where reliable, a percentage of submitted requests.
- Include useful empty, loading, and error states so the reports remain understandable with sparse or unavailable data.

#### 3. Clear CCRO Admin Navigation

**Implementation status: Proposed.** Reorganize the CCRO Administrator navigation by responsibility so existing and new pages form one coherent workspace.

- Place the new Overview first and use it as the role's landing destination.
- Group daily request, appointment, and counter tasks under Operations.
- Group service and staff administration under Management.
- Reserve Insights and Configuration groups for the corresponding roadmap items.
- Keep Browse Services available as a citizen-view preview, visually separate from administration tasks.

### P1 — Implement Only If P0 Is Stable

#### 1. Appointments

**Implementation status: Proposed.** Add an appointment list and basic slot-capacity management so administrators can see scheduled demand and control availability without introducing a full scheduling suite.

#### 2. Operational Activity

**Implementation status: Proposed.** Present operational activity using existing request and application logs. The page should focus on case-processing events relevant to CCRO leadership and remain distinct from the System Audit Center's technical and privileged-administration records.

#### 3. Staff and Department Visibility

**Implementation status: Proposed.** Add department information and a basic workload breakdown to the staff experience. Prefer simple, explainable counts over advanced performance scoring.

### P2 — After the Presentation

The following additions are valuable but should not compete with the P0 presentation path:

- Office hours and closure-date settings.
- Queue counter and lane configuration.
- Notification delivery monitoring and message templates.
- CSV exports and broader report date, service, department, and status filters.

Advanced analytics, online payments, SMS delivery, and integrations with external government systems remain outside this roadmap's scope.

## Recommended Navigation

The complete information architecture should grow toward the following structure. Items may be hidden until their corresponding feature is implemented.

```text
Overview

Operations
  Request Queue
  Appointments
  Queue Desk

Management
  Services Registry
  Staff & Departments

Insights
  Reports
  Operational Activity

Configuration
  Office & Queue Settings
  Notifications

Preview Citizen Services
```

For the presentation build, navigation must not contain empty destinations. Ship the P0 destinations and existing modules first, then reveal P1 and P2 entries as their pages become usable.

## Two-Day Delivery Sequence

### Day 1 — Operational Overview and Navigation

1. Create the CCRO Admin Overview and make it the role's default landing page.
2. Connect request-stage, incomplete-request, ready-for-release/unpaid, and current-queue metrics to existing application data.
3. Reorganize the CCRO navigation into Overview, Operations, and Management, while retaining access to all existing modules.
4. Add credible loading, empty, and error states for the overview.

### Day 2 — Required Reports and Presentation Readiness

1. Add the three basic reports: request volume, processing time, and incomplete-submission frequency.
2. Verify CCRO and System Administrator route and data-access boundaries.
3. Polish responsive layout, labels, metric definitions, and all presentation states.
4. Prepare representative demo data that exercises the overview, reports, Request Queue, and Queue Desk.
5. Rehearse the primary presentation path and fix blocking or confusing behavior.

Begin P1 work only after the complete P0 experience is stable. A finished overview and trustworthy required reports are more important than partially implemented secondary administration pages.

## Presentation Acceptance Checklist

- [ ] The CCRO Administrator lands on an operational overview instead of the Services Registry.
- [ ] Overview and report metrics are calculated from real application data.
- [ ] Request-stage counts are visible and understandable.
- [ ] Incomplete requests and ready-for-release/unpaid requests are clearly identified.
- [ ] Current queue status is visible from the overview.
- [ ] Reports demonstrate request volume, processing time, and incomplete-submission frequency.
- [ ] Request Queue, Queue Desk, Services Registry, Staff management, and Browse Services remain accessible.
- [ ] CCRO Administrator navigation clearly separates Overview, Operations, Management, and citizen preview functions.
- [ ] CCRO Administrators cannot access System Health, Security Center, Accounts, or the System Audit Center.
- [ ] System Administrators cannot access citizen request contents or uploaded documents.
- [ ] Empty, loading, and error states are polished and presentation-ready.
- [ ] Demo data supports a complete walkthrough without relying on hard-coded metrics.
