# Role-based access control

CiviCheck checks permissions in route guards for navigation and again inside
every server function that reads or changes protected data. Database RLS and
guarded SQL functions provide the final scope boundary.

## Operational roles

| Role | Scope |
|---|---|
| `applicant` | Own requests |
| `staff` | Requests and walk-in intake for the assigned department |
| `supervisor` | Same department scope as staff, with supervisory workflow duties |
| `cashier` | Office-wide payment lookup and verification only |
| `admin` | CCRO services, personnel, requests, and reports |
| `system_admin` | Platform accounts, audit, security, and system health |

## Intake permissions

| Permission | Assigned to | Purpose |
|---|---|---|
| `services:view` | applicant, staff, supervisor, admin | View the public service, requirement, and fee directory |
| `requests:encode_walkin` | staff, supervisor, admin | Encode an accountless request for a walk-in visitor, for a service owned by the caller's department |

## Department scoping

`staff` and `supervisor` are department-scoped. A request belongs to the
department assigned to its service. Server functions and RLS both enforce that
relationship. A missing department assignment scopes the user to no requests,
never to every request.

## Request workflow

New online and walk-in requests begin at `submitted`. Department staff may move
them to `under_validation`, then through processing, approval, and release.
Cashier payment verification remains a separate permission and workflow.
