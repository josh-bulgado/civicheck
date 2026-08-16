# RBAC (Role-Based Access Control)

CiviCheck uses a permission-based access control system. Instead of checking roles directly in components (`if role === 'admin'`), we check **permissions** — this keeps the code decoupled from roles and makes it easy to adjust access without hunting down every role check.

---

## Roles

Defined in `src/lib/permissions.ts`. Sourced from `profiles.role` in the database.

| Role | Description |
|---|---|
| `applicant` | Citizens filing requests |
| `frontdesk` | TBD — treated as applicant-level for now |
| `staff` | CCRO staff processing requests in their department |
| `archive` | Handles archiving of documents |
| `legal` | Handles legal requests (court decrees, etc.) |
| `cashier` | Collects payment for services |
| `admin` | Full control — manages services, users, and all requests |

---

## Permissions

| Permission | Who has it | What it controls |
|---|---|---|
| `services:view` | everyone | See the services list |
| `services:manage` | admin | Add, edit, toggle services on/off |
| `requests:view_own` | applicant | See only their own requests |
| `requests:view_all` | staff, archive, legal, cashier, admin | See all requests in the queue |
| `requests:create` | applicant | Submit a new request |
| `requests:process` | staff, admin | Process requests in their department |
| `requests:archive` | archive, admin | Archive documents |
| `requests:legal` | legal, admin | Handle legal requests |
| `requests:collect_payment` | cashier, admin | Collect payment |
| `users:manage` | admin | Manage user accounts |
| `dashboard:applicant` | applicant | Applicant dashboard view |
| `dashboard:staff` | staff, archive, legal, cashier | Internal staff dashboard view |
| `dashboard:admin` | admin | Admin dashboard view |

---

## Files

```
src/
  lib/
    permissions.ts      # Role type, Permission type, ROLE_PERMISSIONS map, helper functions
  hooks/
    usePermissions.ts   # React hook — use this inside components
```

---

## How to Use

### Inside components — use the hook

```tsx
import { usePermissions } from "~/hooks/usePermissions"

function MyComponent() {
  const { can, role, isAdmin, isInternal } = usePermissions()

  return (
    <>
      {can("services:manage") && <AddServiceButton />}
      {can("dashboard:admin") && <AdminDashboardView />}
      {can("dashboard:staff") && <StaffDashboardView />}
      {can("dashboard:applicant") && <ApplicantDashboardView />}
    </>
  )
}
```

### Inside route `beforeLoad` — use the plain function

> Hooks cannot run outside React components, so use `hasPermission` directly in route guards.

```ts
import { createFileRoute, redirect } from "@tanstack/react-router"
import { hasPermission } from "~/lib/permissions"

export const Route = createFileRoute("/_authed/admin/services")({
  beforeLoad: ({ context }) => {
    if (!hasPermission(context.user?.role, "services:manage")) {
      throw redirect({ to: "/dashboard" })
    }
  },
})
```

### Sidebar navigation — filter links by permission

```tsx
const { can } = usePermissions()

const navItems = [
  { label: "Dashboard",       to: "/dashboard",        show: true },
  { label: "Services",        to: "/services",         show: can("services:view") },
  { label: "My Requests",     to: "/my-requests",      show: can("requests:view_own") },
  { label: "Request Queue",   to: "/requests",         show: can("requests:view_all") },
  { label: "Admin / Services",to: "/admin/services",   show: can("services:manage") },
  { label: "Users",           to: "/admin/users",      show: can("users:manage") },
].filter((item) => item.show)
```

---

## Rules

- **Always do both** — use `can()` to hide UI elements (UX), and `hasPermission()` in `beforeLoad` to protect routes (security). Hiding a button is not enough — users can still access routes directly via URL.
- **Never check roles directly** in components or routes (e.g. `if role === 'admin'`). Always go through `can()` or `hasPermission()`. This way, if a role's permissions change, you only update `permissions.ts`.
- **Adding a new role** — add it to the `Role` type and `ROLE_PERMISSIONS` map in `permissions.ts`. Nothing else needs to change.
- **Adding a new permission** — add it to the `Permission` type, assign it to the relevant roles in `ROLE_PERMISSIONS`, then use `can()` or `hasPermission()` where needed.
