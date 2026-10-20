"use client";

import { Search } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
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
  /** The applicant shell: logo and name only, search lives in the top bar. */
  citizen?: boolean;
}

/**
 * The collapse/expand button, the same in every shell. Open, it sits at the end
 * of the logo row. Folded, it covers the logo and shows when the pointer or
 * keyboard focus reaches it; whatever it covers should fade on
 * `group-hover/brand` and `group-has-focus-visible/brand` (see the callers).
 * `foldedClassName` places and sizes it over that logo. Below `md` the sidebar
 * is a sheet with its own trigger, so there is none here.
 */
function RailToggle({ foldedClassName }: { foldedClassName: string }) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isMobile) return null;

  return (
    <SidebarTrigger
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      className={cn(
        "size-9 shrink-0 rounded-full text-portal-ink-2 hover:bg-card/60 hover:text-foreground [&_svg]:size-5",
        // Folded: it covers the logo and stays invisible until reached.
        "group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:border-2 group-data-[collapsible=icon]:border-brand-gold group-data-[collapsible=icon]:bg-card group-data-[collapsible=icon]:text-primary group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:transition-opacity group-data-[collapsible=icon]:duration-150",
        "group-data-[collapsible=icon]:group-hover/brand:opacity-100 group-data-[collapsible=icon]:focus-visible:opacity-100",
        foldedClassName,
      )}
    />
  );
}

export function NavHeader({ workspace, citizen = false }: NavHeaderProps) {
  const hotkeyLabel = useHotkeyLabel();

  if (citizen) {
    // `group-data-[collapsible=icon]` is the sidebar folded to its rail. Only the
    // column narrows: the seal stays where it is, the wordmark fades and is
    // clipped, and the toggle sits on top of the seal, appearing when the pointer
    // or keyboard focus reaches it.
    return (
      // The bottom padding is the 40px between the logo and the first pill.
      <SidebarHeader className="gap-0 px-2.5 pt-2 pb-10">
        <div className="group/brand relative flex items-center gap-2.5">
          <QuietLink
            to="/dashboard"
            aria-label="CiviCheck home"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-sidebar-foreground"
          >
            {/* Text stand-in: the official emblem isn't cleared for use yet. */}
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
          <RailToggle foldedClassName="group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:left-0 group-data-[collapsible=icon]:size-10.5" />
        </div>
      </SidebarHeader>
    );
  }

  return (
    // No dividing lines: like the applicant's, this sidebar sits on the ground.
    // Folding only narrows the column (see the applicant header above): every
    // icon here is on the rail's centre line, 47px from the screen edge.
    <SidebarHeader className="p-2.5">
      <div className="group/brand relative flex items-center gap-2">
        <QuietLink
          to="/dashboard"
          aria-label="CiviCheck home"
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-[7px] text-sidebar-foreground transition-colors hover:bg-card/60"
        >
          <CiviCheckIdentity
            compact
            className="[&>span:first-child]:transition-opacity group-data-[collapsible=icon]:group-hover/brand:[&>span:first-child]:opacity-0 group-data-[collapsible=icon]:group-has-focus-visible/brand:[&>span:first-child]:opacity-0 [&>span:last-child]:transition-opacity group-data-[collapsible=icon]:[&>span:last-child]:opacity-0"
          />
        </QuietLink>
        <RailToggle foldedClassName="group-data-[collapsible=icon]:top-1/2 group-data-[collapsible=icon]:left-[7px] group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:-translate-y-1/2" />
      </div>
      {/* Collapses to nothing rather than unmounting, so what is below it glides
          up instead of jumping. */}
      <p className="h-5 overflow-hidden px-2 text-xs font-semibold whitespace-nowrap text-primary transition-[height,opacity] duration-200 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:opacity-0">
        {workspace.label}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        aria-label="Search CiviCheck navigation"
        className="w-full justify-between gap-0 overflow-hidden has-data-[icon=inline-start]:pl-[19px]"
        onClick={openCommandPalette}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Search data-icon="inline-start" />
          <span className="truncate text-sm font-medium transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
            Search
          </span>
        </div>
        <Kbd className="transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
          {hotkeyLabel(PALETTE_HOTKEY)}
        </Kbd>
      </Button>
    </SidebarHeader>
  );
}
