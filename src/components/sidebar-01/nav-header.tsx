"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { SidebarHeader, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import type { NavItem } from "~/components/sidebar-01/types";
import type { WorkspaceDetails } from "~/components/sidebar-01/workspace";

interface NavHeaderProps {
  items: NavItem[];
  workspace: WorkspaceDetails;
}

export function NavHeader({ items, workspace }: NavHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const { state } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
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
          onClick={() => setOpen(true)}
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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search everything..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {items.map((item) => (
              <CommandItem
                className="py-2!"
                key={item.id}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: item.url });
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
