import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  Shield,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import type { Permission, Role } from "~/lib/permissions";
import type { NavGroup, NavItem } from "./types";

/**
 * Sidebar navigation as data, in two parts:
 *
 *  1. NAV_ENTRIES — every link the app can show, once, with the permission that
 *     unlocks it.
 *  2. ROLE_LAYOUTS — for each role, how those links are grouped and ordered.
 *
 * A link appears for a role only if the role's layout lists it AND the role
 * holds its permission. Listing a link a role can't use is harmless; leaving a
 * permitted link out of the layout hides it (that is how admin avoids showing
 * "Browse Services", which it manages from the Services Registry instead).
 *
 * Kept free of React and route code so the grouping can be checked on its own.
 */

interface NavEntry {
  title: string | ((role: Role) => string);
  url: string;
  icon: NavItem["icon"];
  /** Shown when the role holds at least one of these permissions. */
  anyOf: Permission[];
}

const NAV_ENTRIES = {
  // ── Home ──────────────────────────────────────────────────────────────────
  "admin-overview": {
    title: "Overview",
    url: "/admin",
    icon: Gauge,
    anyOf: ["dashboard:admin"],
  },
  "staff-dashboard": {
    title: (role) => (role === "cashier" ? "Cashier Dashboard" : "Staff Dashboard"),
    url: "/staff-dashboard",
    icon: LayoutDashboard,
    anyOf: ["dashboard:staff"],
  },
  "applicant-dashboard": {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    anyOf: ["dashboard:applicant"],
  },
  // Applicants read their own request-scoped feed; personnel read their own
  // staff_notifications rows. Same page, different data (see notifications.queries).
  notifications: {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    anyOf: ["requests:view_own", "notifications:view_staff"],
  },

  // ── Requests ──────────────────────────────────────────────────────────────
  "request-queue": {
    title: "Request Queue",
    url: "/requests",
    icon: ListChecks,
    anyOf: ["requests:view_all"],
  },
  services: {
    // Personnel use the catalog as a reference; applicants browse it to apply.
    title: (role) =>
      role === "staff" || role === "supervisor" ? "Service Reference" : "Browse Services",
    url: "/services",
    icon: BookOpen,
    anyOf: ["services:view"],
  },
  "my-requests": {
    title: "My Requests",
    url: "/my-requests",
    icon: ClipboardCheck,
    anyOf: ["requests:view_own"],
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  "cashier-counter": {
    title: "Cashier Counter",
    url: "/cashier",
    icon: ClipboardCheck,
    anyOf: ["requests:collect_payment"],
  },
  "payment-history": {
    title: "Payment History",
    url: "/payment-history",
    icon: History,
    anyOf: ["requests:view_payments"],
  },

  // ── CCRO administration ───────────────────────────────────────────────────
  "admin-services": {
    title: "Services Registry",
    url: "/admin/services",
    icon: LayoutDashboard,
    anyOf: ["services:manage"],
  },
  "admin-staff": {
    title: "Staff Management",
    url: "/admin/staff",
    icon: UserPlus,
    anyOf: ["users:invite_staff"],
  },
  "admin-reports": {
    title: "Reports",
    url: "/admin/reports",
    icon: BarChart3,
    anyOf: ["dashboard:admin"],
  },

  // ── Platform administration ───────────────────────────────────────────────
  "system-health": {
    title: "System Health",
    url: "/system-admin/health",
    icon: Activity,
    anyOf: ["health:view"],
  },
  "system-security": {
    title: "Security Center",
    url: "/system-admin/security",
    icon: ShieldAlert,
    anyOf: ["security:view"],
  },
  "system-accounts": {
    title: "Accounts Center",
    url: "/system-admin/accounts",
    icon: Shield,
    anyOf: ["accounts:view_all"],
  },
  "system-audit": {
    title: "Audit Center",
    url: "/system-admin/audit",
    icon: History,
    anyOf: ["audit:view"],
  },
} satisfies Record<string, NavEntry>;

export type NavItemId = keyof typeof NAV_ENTRIES;

interface GroupLayout {
  id: string;
  /** Omit for the unlabelled home group at the top. */
  label?: string;
  itemIds: NavItemId[];
}

// Staff and supervisor share one layout: same links, same department scope.
const PERSONNEL_LAYOUT: GroupLayout[] = [
  { id: "home", itemIds: ["staff-dashboard", "notifications"] },
  { id: "requests", label: "Requests", itemIds: ["request-queue", "services"] },
];

/**
 * Every role's layout. Each starts with an unlabelled home group (its
 * dashboard, then Notifications) so the inbox is in the same place for everyone.
 */
const ROLE_LAYOUTS: Record<Role, GroupLayout[]> = {
  applicant: [
    { id: "home", itemIds: ["applicant-dashboard", "notifications"] },
    { id: "requests", label: "Requests", itemIds: ["services", "my-requests"] },
  ],
  staff: PERSONNEL_LAYOUT,
  supervisor: PERSONNEL_LAYOUT,
  cashier: [
    { id: "home", itemIds: ["staff-dashboard", "notifications"] },
    { id: "payments", label: "Payments", itemIds: ["cashier-counter", "payment-history"] },
  ],
  admin: [
    { id: "home", itemIds: ["admin-overview", "notifications"] },
    { id: "operations", label: "Operations", itemIds: ["request-queue"] },
    { id: "management", label: "Management", itemIds: ["admin-services", "admin-staff"] },
    { id: "insights", label: "Insights", itemIds: ["admin-reports", "payment-history"] },
  ],
  system_admin: [
    { id: "monitoring", label: "Monitoring", itemIds: ["system-health", "system-security"] },
    { id: "access-audit", label: "Access & Audit", itemIds: ["system-accounts", "system-audit"] },
  ],
};

/**
 * The groups to render for `role`. `can` is the caller's permission check, so
 * this stays pure; empty groups are dropped.
 */
export function buildNavGroups(
  role: Role,
  can: (permission: Permission) => boolean,
  unreadNotifications = 0,
): NavGroup[] {
  return ROLE_LAYOUTS[role]
    .map(({ itemIds, ...group }) => ({
      ...group,
      items: itemIds.flatMap((id): NavItem[] => {
        const entry: NavEntry = NAV_ENTRIES[id];
        if (!entry.anyOf.some((permission) => can(permission))) return [];
        return [
          {
            id,
            title: typeof entry.title === "function" ? entry.title(role) : entry.title,
            url: entry.url,
            icon: entry.icon,
            ...(id === "notifications" ? { badge: unreadNotifications } : {}),
          },
        ];
      }),
    }))
    .filter((group) => group.items.length > 0);
}
