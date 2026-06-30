"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import {
  IconAd2,
  IconBellRinging,
  IconCalendar,
  IconCalendarStats,
  IconListDetails,
  IconNews,
  IconNotebook,
  IconProgressCheck,
  IconSettingsCode,
} from "@tabler/icons-react";
import { LayoutDashboard, Package } from "lucide-react";
import { NavCollapsible } from "~/components/sidebar-01/nav-collapsible";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { usePermissions } from "~/hooks/usePermissions";
import type { SidebarData } from "./types";

const data: SidebarData = {
  user: {
    name: "ephraim",
    email: "ephraim@blocks.so",
    avatar: "/avatar-01.png",
  },
  navMain: [
    {
      id: "overview",
      title: "Overview",
      url: "#",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      id: "tasks",
      title: "Tasks",
      url: "#",
      icon: IconListDetails,
    },
    {
      id: "meetings",
      title: "Meetings",
      url: "#",
      icon: IconCalendarStats,
    },
    {
      id: "notes",
      title: "Notes",
      url: "#",
      icon: IconNotebook,
    },
    {
      id: "calendar",
      title: "Calendar",
      url: "#",
      icon: IconCalendar,
    },
    {
      id: "completed",
      title: "Completed",
      url: "#",
      icon: IconProgressCheck,
    },
    {
      id: "notifications",
      title: "Notifications",
      url: "#",
      icon: IconBellRinging,
    },
  ],
  navCollapsible: {
    favorites: [
      {
        id: "design",
        title: "Design",
        href: "#",
        color: "bg-green-400 dark:bg-green-300",
      },
      {
        id: "development",
        title: "Development",
        href: "#",
        color: "bg-blue-400 dark:bg-blue-300",
      },
      {
        id: "workshop",
        title: "Workshop",
        href: "#",
        color: "bg-orange-400 dark:bg-orange-300",
      },
      {
        id: "personal",
        title: "Personal",
        href: "#",
        color: "bg-red-400 dark:bg-red-300",
      },
    ],
    teams: [
      {
        id: "engineering",
        title: "Engineering",
        icon: IconSettingsCode,
      },
      {
        id: "marketing",
        title: "Marketing",
        icon: IconAd2,
      },
    ],
    topics: [
      {
        id: "product-updates",
        title: "Product Updates",
        icon: Package,
      },
      {
        id: "company-news",
        title: "Company News",
        icon: IconNews,
      },
    ],
  },
};

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const sidebarUser = user ? {
    name: `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0],
    email: user.email,
    avatar: "/avatar-01.png",
  } : data.user;

  const { can } = usePermissions();

  // Build navMain dynamically based on permissions
  const navMain = [];

  if (can("services:manage")) {
    navMain.push({
      id: "admin-services",
      title: "Services Registry",
      url: "/admin/services",
      icon: LayoutDashboard,
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

  if (can("requests:view_all")) {
    navMain.push({
      id: "request-queue",
      title: "Request Queue",
      url: "/requests",
      icon: IconListDetails,
    });
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <NavHeader data={data} />
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <NavFooter user={sidebarUser} />
    </Sidebar>
  );
}
