"use client";

import { Sidebar, SidebarContent, useSidebar } from "~/components/ui/sidebar";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { AdminNav } from "~/components/sidebar-01/admin-nav";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";
import type { AccountProfile } from "~/features/account/account.types";
import { buildNavGroups, type NavItemId } from "./nav-config";
import { getWorkspaceDetails } from "./workspace";

/**
 * What goes in the sidebar, and how it's grouped, lives in `nav-config.ts`.
 * To add a link or move one between sections, edit that file.
 *
 * Every role gets the same frame: no box, the sidebar sitting directly on the
 * page's ground (a sheet below `md`), folding to an icon rail on desktop.
 * All roles share the portal's pills, branding and account card. Internal
 * workspaces add search; CCRO administrators have inline navigation groups.
 */
export function AppSidebar({
  user,
  unreadNotifications = 0,
  attentionIds,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: AccountProfile | null;
  unreadNotifications?: number;
  attentionIds?: readonly NavItemId[];
}) {
  const { can, role } = usePermissions();
  const { isMobile } = useSidebar();
  const workspace = getWorkspaceDetails(role);
  const citizen = role === "applicant";
  const admin = role === "admin";

  const navGroups = buildNavGroups(role, can, unreadNotifications, attentionIds);

  const sections = (
    <>
      <NavHeader
        workspace={workspace}
        citizen={citizen}
        showSearch={role !== "system_admin"}
      />
      {/* The padding gives the active pill's shadow room: this container
          scrolls on a short screen, and overflow clips whatever leaves it. The
          negative margins cancel it out so the pills sit where the grid says. */}
      <SidebarContent className="-mx-3.5 -my-6 px-3.5 py-6">
        {admin ? (
          <AdminNav groups={navGroups} />
        ) : (
          <NavMain groups={navGroups} label={workspace.label} />
        )}
      </SidebarContent>
      <NavFooter account={user ?? null} />
    </>
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      // The frame: 10px of ground above, below and to the left, and the 6px
      // gap before the panel on the right. Together they make up the
      // `--sidebar-width` the route sets.
      className="p-2.5 pr-1.5"
      {...props}
    >
      {/* Desktop shares the page's ground; mobile sheets paint the same wash. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col pt-1.5 pr-2 pb-1 pl-1.5",
          isMobile && "bg-(image:--portal-ground)",
        )}
      >
        {sections}
      </div>
    </Sidebar>
  );
}
