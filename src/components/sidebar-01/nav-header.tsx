"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { SidebarHeader, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { SidebarData } from "~/components/sidebar-01/types";

interface NavHeaderProps {
  data: SidebarData;
}

export function NavHeader({ data }: NavHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const { state } = useSidebar();
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
      <SidebarHeader>
        <div
          className={cn(
            "flex items-center px-2 pb-0 pt-3 cursor-pointer overflow-hidden",
            isCollapsed ? "justify-center" : "justify-between"
          )}
          onClick={() => setOpen(true)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            {!isCollapsed && (
              <span className="text-sm text-muted-foreground font-normal truncate">
                Search
              </span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-center px-2 py-1 border border-border rounded-md shrink-0">
              <kbd className="text-muted-foreground inline-flex font-[inherit] text-xs font-medium">
                <span className="opacity-70">⌘K</span>
              </kbd>
            </div>
          )}
        </div>
      </SidebarHeader>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search everything..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {data.navMain.map((item) => (
              <CommandItem
                className="py-2!"
                key={item.id}
                onSelect={() => setOpen(false)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2" />
          <CommandGroup heading="Favorites">
            {data.navCollapsible.favorites.map((item) => (
              <CommandItem
                className="py-2!"
                key={item.id}
                onSelect={() => setOpen(false)}
              >
                <div className={cn("mr-2 h-3 w-3 rounded-full", item.color)} />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2" />
          <CommandGroup heading="Teams">
            {data.navCollapsible.teams.map((item) => (
              <CommandItem
                className="py-2!"
                key={item.id}
                onSelect={() => setOpen(false)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2" />
          <CommandGroup heading="Topics">
            {data.navCollapsible.topics.map((item) => (
              <CommandItem
                className="py-2!"
                key={item.id}
                onSelect={() => setOpen(false)}
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
