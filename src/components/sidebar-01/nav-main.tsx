"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import type { NavItem } from "./types";

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup className="px-2.5 py-4 group-data-[collapsible=icon]:px-2">
      <div className="mb-2 px-2 text-xs font-semibold text-sidebar-muted group-data-[collapsible=icon]:hidden">
        Navigation
      </div>
      <SidebarMenu className="gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.id}>
              <Link
                to={item.url}
                className="flex w-full items-center rounded-lg [&[data-status=active]>button]:bg-primary-soft [&[data-status=active]>button]:font-bold [&[data-status=active]>button]:text-primary"
              >
                <SidebarMenuButton
                  tooltip={item.title}
                  className="h-10 w-full justify-start gap-3 rounded-lg px-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
