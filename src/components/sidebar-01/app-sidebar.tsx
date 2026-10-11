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
 *
 * Applicants get the citizen portal's inset card (always open on desktop, a
 * sheet below `md`); everyone else keeps the icon-collapsible workspace rail.
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
  const citizen = role === "applicant";

  const navGroups = buildNavGroups(role, can, unreadNotifications);

  return (
    <Sidebar
      collapsible={citizen ? "offcanvas" : "icon"}
      variant={citizen ? "floating" : "sidebar"}
      className={citizen ? "p-4 pr-0" : undefined}
      {...props}
    >
      <NavHeader workspace={workspace} citizen={citizen} />
      <SidebarContent className={citizen ? "px-3" : undefined}>
        <NavMain groups={navGroups} citizen={citizen} />
      </SidebarContent>
      <NavFooter account={user ?? null} citizen={citizen} />
    </Sidebar>
  );
}
