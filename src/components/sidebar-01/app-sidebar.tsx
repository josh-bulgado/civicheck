"use client";

import { Sidebar, SidebarContent, useSidebar } from "~/components/ui/sidebar";
import { NavFooter } from "~/components/sidebar-01/nav-footer";
import { NavHeader } from "~/components/sidebar-01/nav-header";
import { NavMain } from "~/components/sidebar-01/nav-main";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";
import type { AccountProfile } from "~/features/account/account.types";
import { buildNavGroups } from "./nav-config";
import { getWorkspaceDetails } from "./workspace";

/**
 * What goes in the sidebar, and how it's grouped, lives in `nav-config.ts`.
 * To add a link or move one between sections, edit that file.
 *
 * Applicants get the citizen portal's calm sidebar: no box, sitting directly on
 * the gradient ground (always open on desktop, a sheet below `md`). Everyone
 * else keeps the icon-collapsible workspace rail.
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
  const { isMobile } = useSidebar();
  const workspace = getWorkspaceDetails(role);
  const citizen = role === "applicant";

  const navGroups = buildNavGroups(role, can, unreadNotifications);

  const sections = (
    <>
      <NavHeader workspace={workspace} citizen={citizen} />
      {/* The padding gives the active pill's shadow room: this container
          scrolls on a short screen, and overflow clips whatever leaves it. The
          negative margins cancel it out so the pills sit where the grid says. */}
      <SidebarContent className={citizen ? "-mx-3.5 -my-6 px-3.5 py-6" : undefined}>
        <NavMain groups={navGroups} citizen={citizen} />
      </SidebarContent>
      <NavFooter account={user ?? null} citizen={citizen} />
    </>
  );

  return (
    <Sidebar
      collapsible={citizen ? "offcanvas" : "icon"}
      variant={citizen ? "floating" : "sidebar"}
      // The frame: 10px of ground above, below and to the left, and the 6px
      // gap before the panel on the right. Together they make up the
      // `--sidebar-width` the route sets.
      className={citizen ? "p-2.5 pr-1.5" : undefined}
      {...props}
    >
      {citizen ? (
        // 248px column with the design's own inset. Desktop shows the page's
        // ground through it; the mobile sheet has none behind it, so it paints
        // its own, or the active pill (white) would disappear into a white sheet.
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col pt-1.5 pr-2 pb-1 pl-1.5",
            isMobile && "bg-(image:--portal-ground)",
          )}
        >
          {sections}
        </div>
      ) : (
        sections
      )}
    </Sidebar>
  );
}
