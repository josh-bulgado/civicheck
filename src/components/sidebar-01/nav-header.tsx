"use client";

import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { SidebarHeader, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { openCommandPalette } from "~/components/sidebar-01/command-palette";
import type { WorkspaceDetails } from "~/components/sidebar-01/workspace";

interface NavHeaderProps {
  workspace: WorkspaceDetails;
  /** The applicant shell: brand block only, search lives in the top bar. */
  citizen?: boolean;
}

export function NavHeader({ workspace, citizen = false }: NavHeaderProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (citizen) {
    return (
      <SidebarHeader className="gap-0 px-3 pt-6 pb-0">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 rounded-xl px-2 text-sidebar-foreground"
        >
          {/* Text stand-in: the official emblem isn't cleared for use yet. */}
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-white text-[10px] font-extrabold tracking-[0.02em] text-primary"
            aria-hidden="true"
          >
            CCRO
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-lg leading-tight font-extrabold tracking-[-0.02em]">
              CiviCheck
            </span>
            <span className="truncate text-xs font-semibold text-primary">
              {workspace.label}
            </span>
          </span>
        </Link>
        <div className="mx-2 mt-5 mb-4 h-px bg-sidebar-border" />
      </SidebarHeader>
    );
  }

  return (
    <SidebarHeader className="border-b border-sidebar-border p-2.5 group-data-[collapsible=icon]:px-2">
      <Link
        to="/dashboard"
        className={cn(
          "mb-1 flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
          isCollapsed && "mx-auto justify-center px-0",
        )}
      >
        <CiviCheckIdentity
          compact
          className={cn(
            isCollapsed &&
              "mx-auto justify-center gap-0 [&>span:first-child]:size-8 [&>span:last-child]:hidden",
          )}
        />
      </Link>
      {!isCollapsed && (
        <p className="px-2 pb-1 text-xs font-semibold text-primary">
          {workspace.label}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        aria-label="Search CiviCheck navigation"
        className={cn(
          "w-full justify-between overflow-hidden",
          isCollapsed ? "justify-center" : "justify-between",
        )}
        onClick={openCommandPalette}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Search data-icon="inline-start" />
          {!isCollapsed && (
            <span className="truncate text-sm font-medium">
              Search
            </span>
          )}
        </div>
        {!isCollapsed && (
          <Kbd>⌘K</Kbd>
        )}
      </Button>
    </SidebarHeader>
  );
}
