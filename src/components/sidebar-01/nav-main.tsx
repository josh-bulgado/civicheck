"use client";

import { Fragment } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import type { NavGroup } from "./types";

export function NavMain({ groups }: { groups: NavGroup[] }) {
  return (
    <div className="flex flex-col py-2">
      {groups.map((group) => (
        <Fragment key={group.id}>
          {group.separatorBefore ? (
            <SidebarSeparator className="my-2" />
          ) : null}
          <SidebarGroup className="px-2.5 py-2 group-data-[collapsible=icon]:px-2">
            {group.label ? (
              <SidebarGroupLabel className="font-semibold uppercase tracking-[0.1em] text-sidebar-muted">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarMenu className="gap-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id}>
                    <Link
                      to={item.url}
                      activeOptions={{ exact: item.url === "/admin" }}
                      className="flex w-full items-center rounded-lg [&[data-status=active]>button]:bg-primary-soft [&[data-status=active]>button]:font-bold [&[data-status=active]>button]:text-primary"
                    >
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="h-10 w-full justify-start gap-3 rounded-lg px-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </Fragment>
      ))}
    </div>
  );
}
