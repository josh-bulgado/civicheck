"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import {
  IconListDetails,
  IconProgressCheck,
  IconUserPlus,
} from "@tabler/icons-react";
import { Bell, ClipboardPlus, LayoutDashboard } from "lucide-react";
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
  unreadNotifications?: number;
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

  if (can("dashboard:admin")) {
    navMain.push({
      id: "admin-dashboard",
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
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

  if (can("users:manage")) {
    navMain.push({
      id: "admin-staff",
      title: "Staff",
      url: "/admin/staff",
      icon: IconUserPlus,
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
    navMain.push({
      id: "notifications",
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      badge: user?.unreadNotifications ?? 0,
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

  if (can("requests:intake")) {
    navMain.push({
      id: "walk-in-request",
      title: "New Walk-In Request",
      url: "/requests/new",
      icon: ClipboardPlus,
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
