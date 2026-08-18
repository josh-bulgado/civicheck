"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  Shield,
  ShieldAlert,
  Ticket,
  UserPlus,
} from "lucide-react";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { usePermissions } from "~/hooks/usePermissions";
import type { AccountProfile } from "~/features/account/account.types";
import type { NavGroup, NavItem } from "./types";
import { getWorkspaceDetails } from "./workspace";

function createCcroAdminGroups(items: NavItem[]): NavGroup[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const selectItems = (ids: string[]) =>
    ids.flatMap((id) => {
      const item = itemsById.get(id);
      return item ? [item] : [];
    });

  return [
    { id: "overview", items: selectItems(["admin-overview"]) },
    {
      id: "operations",
      label: "Operations",
      items: selectItems(["request-queue", "queue-desk"]),
    },
    {
      id: "management",
      label: "Management",
      items: selectItems(["admin-services", "admin-staff"]),
    },
    {
      id: "insights",
      label: "Insights",
      items: selectItems(["admin-reports"]),
    },
    {
      id: "citizen-preview",
      label: "Citizen Preview",
      separatorBefore: true,
      items: selectItems(["services"]),
    },
  ].filter((group) => group.items.length > 0);
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: AccountProfile | null }) {
  const { can, role } = usePermissions();
  const workspace = getWorkspaceDetails(role);

  // Build navMain dynamically based on permissions
  const navMain: NavItem[] = [];

  if (can("health:view")) {
    navMain.push({
      id: "system-health",
      title: "System Health",
      url: "/system-admin/health",
      icon: Activity,
    });
  }

  if (can("security:view")) {
    navMain.push({
      id: "system-security",
      title: "Security Center",
      url: "/system-admin/security",
      icon: ShieldAlert,
    });
  }

  if (can("dashboard:admin")) {
    navMain.push({
      id: "admin-overview",
      title: "Overview",
      url: "/admin",
      icon: Gauge,
    });
    navMain.push({
      id: "admin-reports",
      title: "Reports",
      url: "/admin/reports",
      icon: BarChart3,
    });
  }

  if (can("services:manage")) {
    navMain.push({
      id: "admin-services",
      title: "Services Registry",
      url: "/admin/services",
      icon: LayoutDashboard,
    });
  }

  if (can("users:invite_staff")) {
    navMain.push({
      id: "admin-staff",
      title: "Staff Management",
      url: "/admin/staff",
      icon: UserPlus,
    });
  }

  if (can("accounts:view_all")) {
    navMain.push({
      id: "system-accounts",
      title: "Accounts Center",
      url: "/system-admin/accounts",
      icon: Shield,
    });
  }

  if (can("audit:view")) {
    navMain.push({
      id: "system-audit",
      title: "Audit Center",
      url: "/system-admin/audit",
      icon: History,
    });
  }

  if (can("dashboard:staff")) {
    navMain.push({
      id: "staff-dashboard",
      title: "Staff Dashboard",
      url: "/staff-dashboard",
      icon: LayoutDashboard,
    });
  }

  if (can("services:view")) {
    navMain.push({
      id: "services",
      title: role === "admin" ? "Preview Citizen Services" : "Browse Services",
      url: "/services",
      icon: ListChecks,
    });
  }

  if (can("requests:view_own")) {
    navMain.push({
      id: "my-requests",
      title: "My Requests",
      url: "/my-requests",
      icon: ClipboardCheck,
    });
  }

  if (can("queue:view_own")) {
    navMain.push({
      id: "appointments",
      title: "My Appointments",
      url: "/appointments",
      icon: CalendarDays,
    });
  }

  if (can("requests:view_all")) {
    navMain.push({
      id: "request-queue",
      title: "Request Queue",
      url: "/requests",
      icon: ListChecks,
    });
  }

  if (can("queue:manage")) {
    navMain.push({
      id: "queue-desk",
      title: "Queue Desk",
      url: "/queue",
      icon: Ticket,
    });
  }

  if (can("requests:collect_payment")) {
    navMain.push({
      id: "cashier-counter",
      title: "Cashier Counter",
      url: "/cashier",
      icon: ClipboardCheck,
    });
  }

  const navGroups =
    role === "admin"
      ? createCcroAdminGroups(navMain)
      : [{ id: "navigation", label: "Navigation", items: navMain }];
  const searchableItems = navGroups.flatMap((group) => group.items);

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <NavHeader items={searchableItems} workspace={workspace} />
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <NavFooter account={user ?? null} />
    </Sidebar>
  );
}
