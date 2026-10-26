"use client";

import { Search } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import {
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "~/components/ui/sidebar";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";
import {
  openCommandPalette,
  PALETTE_HOTKEY,
} from "~/components/sidebar-01/command-palette";
import type { WorkspaceDetails } from "~/components/sidebar-01/workspace";

interface NavHeaderProps {
  workspace: WorkspaceDetails;
  /** Applicant search lives in the page's top bar. */
  citizen?: boolean;
  /** System administration search sits above the main page heading. */
  showSearch?: boolean;
}

function RailToggle() {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isMobile) return null;

  return (
    <SidebarTrigger
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      className={cn(
        "z-10 size-9 shrink-0 rounded-full text-portal-ink-2 hover:bg-card/60 hover:text-foreground active:not-aria-[haspopup]:translate-y-0 [&_svg]:size-5",
        "group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:left-0 group-data-[collapsible=icon]:size-10.5 group-data-[collapsible=icon]:border-2 group-data-[collapsible=icon]:border-brand-gold group-data-[collapsible=icon]:bg-card group-data-[collapsible=icon]:text-primary group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:transition-opacity group-data-[collapsible=icon]:duration-150",
        "group-data-[collapsible=icon]:group-hover/brand:opacity-100 group-data-[collapsible=icon]:focus-visible:opacity-100",
      )}
    />
  );
}

/** Shared branding for every role; internal workspaces also have a search pill. */
export function NavHeader({
  workspace,
  citizen = false,
  showSearch = true,
}: NavHeaderProps) {
  const hotkeyLabel = useHotkeyLabel();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader
      className={cn("gap-0 px-2.5 pt-2 pb-10", !citizen && "pb-6")}
    >
      <div className="group/brand relative flex items-center gap-2.5">
        <QuietLink
          to="/dashboard"
          aria-label="CiviCheck home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-sidebar-foreground"
        >
          {/* Text stand-in for the official emblem. */}
          <span
            className={cn(
              "flex size-10.5 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-card text-[10px] font-extrabold tracking-[0.02em] text-primary transition-opacity duration-150",
              "group-data-[collapsible=icon]:group-hover/brand:opacity-0 group-data-[collapsible=icon]:group-has-focus-visible/brand:opacity-0",
            )}
            aria-hidden="true"
          >
            CCRO
          </span>
          <span className="truncate text-[23px] font-semibold tracking-[-0.02em] transition-opacity duration-150 group-data-[collapsible=icon]:text-clip group-data-[collapsible=icon]:opacity-0">
            CiviCheck
          </span>
        </QuietLink>
        <RailToggle />
      </div>

      {!citizen && (
        <>
          <p className="mt-2 mb-4 h-5 overflow-hidden text-xs font-medium whitespace-nowrap text-primary transition-[height,margin,opacity] duration-200 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:opacity-0">
            {workspace.label}
          </p>
          {showSearch && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              aria-label="Search CiviCheck navigation"
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              className="h-12 w-full justify-between gap-0 overflow-hidden rounded-[14px] bg-portal-panel text-primary hover:bg-card/80 has-data-[icon=inline-start]:pl-4 group-data-[collapsible=icon]:mt-6 group-data-[collapsible=icon]:w-10.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:has-data-[icon=inline-start]:pl-0"
              onClick={() => {
                setOpenMobile(false);
                openCommandPalette();
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Search data-icon="inline-start" className="text-portal-ink-2" />
                <span className="truncate text-sm font-medium transition-opacity duration-150 group-data-[collapsible=icon]:hidden">
                  Search
                </span>
              </span>
              <Kbd className="bg-card text-primary transition-opacity duration-150 group-data-[collapsible=icon]:hidden">
                {hotkeyLabel(PALETTE_HOTKEY)}
              </Kbd>
            </Button>
          )}
        </>
      )}
    </SidebarHeader>
  );
}
