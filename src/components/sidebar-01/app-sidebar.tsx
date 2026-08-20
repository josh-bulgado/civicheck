"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardCheck,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  Shield,
  ShieldAlert,
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
      items: selectItems(["request-queue"]),
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
  ].filter((group) => group.items.length > 0);
}

export function AppSidebar({
  user,
  unreadNotifications = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: AccountProfile | null;
  unreadNotifications?: number;
}) {
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
      title: role === "cashier" ? "Cashier Dashboard" : "Staff Dashboard",
      url: "/staff-dashboard",
      icon: LayoutDashboard,
    });
  }

  if (can("dashboard:applicant")) {
    navMain.push({
      id: "applicant-dashboard",
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    });
  }

  if (can("services:view")) {
    navMain.push({
      id: "services",
      title:
        role === "admin"
          ? "Preview Citizen Services"
          : role === "staff" || role === "supervisor"
            ? "Service Reference"
            : "Browse Services",
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
    navMain.push({
      id: "notifications",
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      badge: unreadNotifications,
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

  if (can("requests:collect_payment")) {
    navMain.push({
      id: "cashier-counter",
      title: "Cashier Counter",
      url: "/cashier",
      icon: ClipboardCheck,
    });
    navMain.push({
      id: "payment-history",
      title: "Payment History",
      url: "/payment-history",
      icon: History,
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
