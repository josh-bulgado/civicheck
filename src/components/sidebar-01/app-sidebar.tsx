"use client";

import { Sidebar, SidebarContent } from "~/components/ui/sidebar";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { usePermissions } from "~/hooks/usePermissions";
import type { AccountProfile } from "~/features/account/account.types";
import { buildNavGroups } from "./nav-config";
import { getWorkspaceDetails } from "./workspace";

/**
 * What goes in the sidebar, and how it's grouped, lives in `nav-config.ts`.
 * To add a link or move one between sections, edit that file.
 */
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

  const navGroups = buildNavGroups(role, can, unreadNotifications);
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
