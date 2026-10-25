"use client";

import { Link } from "@tanstack/react-router";
import { staggerStyle } from "~/components/motion/stagger";
import { SidebarMenuItem, useSidebar } from "~/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { NavItem } from "./types";

// Links and group triggers share the applicant portal's pill and icon rail.
export const NAV_ROW_CLASS =
  "group/nav civic-press relative flex h-13.5 w-full items-center gap-3.5 overflow-hidden rounded-[18px] pr-4.5 pl-4.5 text-left text-[15.5px] text-foreground outline-none transition-[width,margin,padding,transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-card/50 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:ml-[3px] group-data-[collapsible=icon]:w-13.5 group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:pl-[15px] data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:shadow-portal-nav-active data-[status=active]:hover:bg-card";

export const NAV_ICON_CLASS =
  "size-5.5 shrink-0 text-portal-ink-2 group-data-[status=active]/nav:fill-primary/14 group-data-[status=active]/nav:text-primary";

export const NAV_LABEL_CLASS =
  "min-w-0 flex-1 truncate transition-opacity duration-150 group-data-[collapsible=icon]:text-clip group-data-[collapsible=icon]:opacity-0";

export function SidebarNavItem({ item, index = 0 }: { item: NavItem; index?: number }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  const label = [
    item.title,
    item.badge ? `${item.badge} unread` : null,
    item.attention ? "Needs attention" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <SidebarMenuItem style={staggerStyle(index)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={item.url}
              activeOptions={{ exact: item.url === "/admin", includeSearch: false }}
              aria-label={label}
              className={cn(NAV_ROW_CLASS, !!item.badge && "pr-3.5")}
              onClick={() => setOpenMobile(false)}
            />
          }
        >
          <Icon strokeWidth={1.8} className={NAV_ICON_CLASS} aria-hidden="true" />
          <span className={NAV_LABEL_CLASS}>{item.title}</span>
          {item.attention && (
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full bg-health-warning-dot ring-2 ring-card group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-2.5 group-data-[collapsible=icon]:right-2.5"
            />
          )}
          {!!item.badge && (
            <>
              <span
                key={item.badge}
                className="civic-enter-scale flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-gold px-1.75 text-[13px] font-bold text-foreground transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0"
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
              <span
                aria-hidden="true"
                className="absolute top-2.5 right-2.5 hidden size-2.5 rounded-full bg-brand-gold ring-2 ring-card group-data-[collapsible=icon]:block"
              />
            </>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} hidden={state !== "collapsed" || isMobile}>
          {label}
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  );
}
