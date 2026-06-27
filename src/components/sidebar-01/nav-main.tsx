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
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.id}>
              <Link to={item.url} className="w-full flex items-center [&.active_button]:bg-sidebar-accent [&.active_button]:text-sidebar-accent-foreground">
                <SidebarMenuButton tooltip={item.title} className="w-full justify-start">
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
