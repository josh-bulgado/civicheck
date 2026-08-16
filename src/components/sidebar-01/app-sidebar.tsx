"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import {
  IconListDetails,
  IconProgressCheck,
  IconUserPlus,
  IconShield,
  IconHistory,
  IconCalendarEvent,
  IconTicket,
} from "@tabler/icons-react";
import { Activity, Gauge, LayoutDashboard, ShieldAlert } from "lucide-react";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { usePermissions } from "~/hooks/usePermissions";
import type { NavItem } from "./types";
import { getWorkspaceDetails } from "./workspace";

type SidebarUser = {
  email: string;
  firstName: string;
  lastName: string;
};

const fallbackUser = {
  name: "CiviCheck User",
  email: "",
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: SidebarUser | null }) {
  const sidebarUser = user
    ? {
        name:
          `${user.firstName} ${user.lastName}`.trim() ||
          user.email.split("@")[0],
        email: user.email,
      }
    : fallbackUser;

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
      title: "Staff",
      url: "/admin/staff",
      icon: IconUserPlus,
    });
  }

  if (can("accounts:view_all")) {
    navMain.push({
      id: "system-accounts",
      title: "Accounts",
      url: "/system-admin/accounts",
      icon: IconShield,
    });
  }

  if (can("audit:view")) {
    navMain.push({
      id: "system-audit",
      title: "Audit Center",
      url: "/system-admin/audit",
      icon: IconHistory,
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
      title: "Browse Services",
      url: "/services",
      icon: IconListDetails,
    });
  }

  if (can("requests:view_own")) {
    navMain.push({
      id: "my-requests",
      title: "My Requests",
      url: "/my-requests",
      icon: IconProgressCheck,
    });
  }

  if (can("queue:view_own")) {
    navMain.push({
      id: "appointments",
      title: "My Appointments",
      url: "/appointments",
      icon: IconCalendarEvent,
    });
  }

  if (can("requests:view_all")) {
    navMain.push({
      id: "request-queue",
      title: "Request Queue",
      url: "/requests",
      icon: IconListDetails,
    });
  }

  if (can("queue:manage")) {
    navMain.push({
      id: "queue-desk",
      title: "Queue Desk",
      url: "/queue",
      icon: IconTicket,
    });
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <NavHeader items={navMain} workspace={workspace} />
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <NavFooter user={sidebarUser} />
    </Sidebar>
  );
}
