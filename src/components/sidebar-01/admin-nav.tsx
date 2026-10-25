"use client";

import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, SlidersHorizontal, TrendingUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "~/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { NavGroup } from "./types";
import { NAV_LABEL_CLASS, NAV_ROW_CLASS, SidebarNavItem } from "./nav-item";

function AdminNavGroup({
  group,
  pathname,
  flyoutOpen,
  onFlyoutOpenChange,
}: {
  group: NavGroup;
  pathname: string;
  flyoutOpen: boolean;
  onFlyoutOpenChange: (open: boolean) => void;
}) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const railFolded = state === "collapsed" && !isMobile;
  const active = group.items.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`),
  );
  const [groupOpen, setGroupOpen] = useState(active);
  const Icon = group.id === "management" ? SlidersHorizontal : TrendingUp;

  // Route changes reveal the destination, while the reader can still collapse
  // the current group or keep both groups open.
  useEffect(() => {
    if (active) setGroupOpen(true);
  }, [pathname, active]);

  if (railFolded) {
    return (
      <SidebarMenuItem>
        <DropdownMenu modal={false} open={flyoutOpen} onOpenChange={onFlyoutOpenChange}>
          <DropdownMenuTrigger
            nativeButton
            openOnHover
            delay={100}
            closeDelay={150}
            aria-label={group.label}
            data-active={active ? "" : undefined}
            className={cn(
              NAV_ROW_CLASS,
              "data-popup-open:bg-card data-popup-open:shadow-portal-nav-active",
              active &&
                "bg-primary-fill font-semibold text-primary-foreground shadow-portal-nav-active hover:bg-primary-fill-hover data-popup-open:bg-primary-fill",
            )}
          >
            <Icon
              strokeWidth={1.8}
              className={cn(
                "size-5.5 shrink-0",
                active ? "text-primary-foreground" : "text-portal-ink-2",
              )}
              aria-hidden="true"
            />
            <span className="sr-only">{group.label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={12}
            alignOffset={-4}
            aria-label={group.label}
            className="w-72 max-w-[calc(100vw-2rem)] rounded-[22px] bg-card p-2 text-foreground shadow-portal-menu ring-1 ring-border/60 motion-reduce:animate-none"
          >
            {group.items.map((item) => {
              const ItemIcon = item.icon;

              return (
                <DropdownMenuItem
                  key={item.id}
                  render={<Link to={item.url} activeOptions={{ includeSearch: false }} />}
                  onClick={() => onFlyoutOpenChange(false)}
                  className="h-12 cursor-pointer gap-3.5 rounded-[14px] px-3.5 text-sm focus:bg-sidebar-accent focus:text-primary data-highlighted:bg-sidebar-accent data-highlighted:text-primary data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-primary"
                >
                  <ItemIcon strokeWidth={1.8} className="size-5" aria-hidden="true" />
                  <span>{item.title}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        open={groupOpen && !railFolded}
        onOpenChange={setGroupOpen}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <CollapsibleTrigger
                aria-label={group.label}
                data-active={active ? "" : undefined}
                className={cn(
                  NAV_ROW_CLASS,
                  "data-panel-open:bg-card/75 data-panel-open:hover:bg-card",
                  active &&
                    "bg-primary-fill font-semibold text-primary-foreground shadow-portal-nav-active hover:bg-primary-fill-hover data-panel-open:bg-primary-fill data-panel-open:hover:bg-primary-fill-hover",
                )}
              />
            }
          >
            <Icon
              strokeWidth={1.8}
              className={cn(
                "size-5.5 shrink-0",
                active ? "text-primary-foreground" : "text-portal-ink-2",
              )}
              aria-hidden="true"
            />
            <span className={NAV_LABEL_CLASS}>{group.label}</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-[transform,opacity] duration-200 group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none",
                groupOpen && !railFolded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} hidden={!railFolded}>
            {group.label}
          </TooltipContent>
        </Tooltip>

        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0 motion-reduce:transition-none">
          <ul
            aria-label={group.label}
            className="relative my-1.5 mr-2 ml-[29px] flex flex-col before:absolute before:top-5.5 before:bottom-5.5 before:left-0 before:w-px before:bg-sidebar-border"
          >
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.url}
                  activeOptions={{ includeSearch: false }}
                  onClick={() => setOpenMobile(false)}
                  className="group/admin-child relative flex h-11 min-w-0 items-center rounded-xl pr-3 pl-6 text-sm text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[status=active]:font-semibold data-[status=active]:text-primary"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sidebar-muted/50 bg-portal-panel group-data-[status=active]/admin-child:size-2 group-data-[status=active]/admin-child:border-primary group-data-[status=active]/admin-child:bg-primary"
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

/** Expanded sidebars use inline groups; the icon rail opens menus alongside it. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { state, isMobile } = useSidebar();
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  useEffect(() => {
    setOpenFlyout(null);
  }, [pathname, state, isMobile]);

  return (
    <nav aria-label="CCRO Administration">
      <SidebarMenu className="gap-2">
        {groups.flatMap((group) =>
          group.id === "management" || group.id === "insights" ? (
            <AdminNavGroup
              key={group.id}
              group={group}
              pathname={pathname}
              flyoutOpen={openFlyout === group.id}
              onFlyoutOpenChange={(open) => {
                setOpenFlyout((current) =>
                  open ? group.id : current === group.id ? null : current,
                );
              }}
            />
          ) : (
            group.items.map((item) => <SidebarNavItem key={item.id} item={item} />)
          ),
        )}
      </SidebarMenu>
    </nav>
  );
}
