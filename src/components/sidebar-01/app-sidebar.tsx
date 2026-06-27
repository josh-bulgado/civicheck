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

  // Build navMain dynamically based on role
  const navMain = [];
  const role = user?.role ?? "applicant";

  if (role === "admin") {
    navMain.push({
      id: "admin-dashboard",
      title: "Admin Dashboard",
      url: "/admin-dashboard",
      icon: LayoutDashboard,
    });
  } else if (role !== "applicant") {
    // frontdesk, staff, archive, legal, cashier
    navMain.push({
      id: "staff-dashboard",
      title: "Staff Dashboard",
      url: "/staff-dashboard",
      icon: LayoutDashboard,
    });
  } else {
    // applicant
    navMain.push({
      id: "services",
      title: "Browse Services",
      url: "/services",
      icon: IconListDetails,
    });
    navMain.push({
      id: "my-requests",
      title: "My Requests",
      url: "/my-requests",
      icon: IconProgressCheck,
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
