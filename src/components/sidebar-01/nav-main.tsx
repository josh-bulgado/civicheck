"use client";

import { Fragment } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { QuietLink } from "~/components/quiet-link";
import { staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";
import type { NavGroup } from "./types";

interface NavMainProps {
  groups: NavGroup[];
  /** The applicant shell: one flat list of pills, no group labels. */
  citizen?: boolean;
}

export function NavMain({ groups, citizen = false }: NavMainProps) {
  const { state, isMobile } = useSidebar();
  // Folded to the icon rail the labels are gone, so the tooltip carries them.
  const railFolded = state === "collapsed" && !isMobile;

  if (citizen) {
    return (
      <SidebarMenu className="civic-stagger gap-2">
        {groups
          .flatMap((group) => group.items)
          .map((item, index) => {
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.id} style={staggerStyle(index)}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <QuietLink
                        to={item.url}
                        aria-label={
                          item.badge
                            ? `${item.title}, ${item.badge} unread`
                            : item.title
                        }
                        // Active is a white pill with a soft blue lift; the label
                        // keeps its ink and only the icon turns brand blue, with a
                        // faint fill inside its strokes. The explicit active+hover
                        // pairing keeps the pill opaque. Folding to the icon rail
                        // only narrows the column: the pill keeps its shape and the
                        // icon stays put while the label fades and gets clipped, so
                        // nothing slides.
                        className={cn(
                          "group/nav civic-press relative flex h-13.5 w-full items-center gap-3.5 overflow-hidden rounded-[18px] pl-4.5 text-[15.5px] text-foreground transition-[width,margin,padding,transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-card/50",
                          // Folded it is a 54px square around the icon. The margin
                          // and padding trade off 1:1 (3 + 15 = the open 18), so the
                          // icon itself does not move while the pill closes in.
                          "group-data-[collapsible=icon]:ml-[3px] group-data-[collapsible=icon]:w-13.5 group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:pl-[15px]",
                          "data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:shadow-portal-nav-active data-[status=active]:hover:bg-card",
                          item.badge ? "pr-3.5" : "pr-4.5",
                        )}
                      />
                    }
                  >
                    <Icon
                      strokeWidth={1.8}
                      className="size-5.5 shrink-0 text-portal-ink-2 group-data-[status=active]/nav:fill-primary/14 group-data-[status=active]/nav:text-primary"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate transition-opacity duration-150 group-data-[collapsible=icon]:text-clip group-data-[collapsible=icon]:opacity-0">
                      {item.title}
                    </span>
                    {!!item.badge && (
                      <>
                        <span
                          key={item.badge}
                          className="civic-enter-scale flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-gold px-1.75 text-[13px] font-bold text-foreground transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0"
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                        {/* Folded, the count is in the tooltip and this dot says
                            there is something unread. */}
                        <span
                          aria-hidden="true"
                          className="absolute top-2.5 right-2.5 hidden size-2.5 rounded-full bg-brand-gold ring-2 ring-card group-data-[collapsible=icon]:block"
                        />
                      </>
                    )}
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={12}
                    hidden={!railFolded}
                  >
                    {item.badge
                      ? `${item.title} · ${item.badge} unread`
                      : item.title}
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            );
          })}
      </SidebarMenu>
    );
  }

  return (
    <div className="flex flex-col py-2">
      {groups.map((group) => (
        <Fragment key={group.id}>
          {group.separatorBefore ? (
            <SidebarSeparator className="my-2" />
          ) : null}
          <SidebarGroup className="px-2.5 py-2">
            {group.label ? (
              <SidebarGroupLabel className="font-semibold uppercase tracking-[0.1em] text-sidebar-muted">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarMenu className="civic-stagger gap-1.5">
              {group.items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id} style={staggerStyle(index)}>
                    <QuietLink
                      to={item.url}
                      activeOptions={{ exact: item.url === "/admin" }}
                      // Active matches the applicant's pill: white lift on the tinted
                      // sidebar, ink label, brand-blue icon with a faint fill.
                      className="flex w-full items-center rounded-[14px] [&[data-status=active]>button]:bg-card [&[data-status=active]>button]:font-semibold [&[data-status=active]>button]:text-foreground [&[data-status=active]>button]:shadow-portal-nav-active [&[data-status=active]>button]:hover:bg-card [&[data-status=active]>button>svg]:fill-primary/14 [&[data-status=active]>button>svg]:text-primary"
                    >
                      <SidebarMenuButton
                        tooltip={item.attention ? `${item.title} · Needs attention` : item.title}
                        // The icon sits on the rail's centre line (19px in), so
                        // folding never moves it: the label fades and is clipped.
                        // Folded the button is a 44px square around the icon; margin and
                        // padding trade off 1:1 (5 + 14 = the open 19).
                        className="civic-press h-11 w-full justify-start gap-3 rounded-[14px] pr-3 pl-[19px] text-sidebar-muted transition-[width,height,padding,margin,background-color,color] hover:bg-card/60 hover:text-foreground group-data-[collapsible=icon]:ml-[5px] group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:pl-[14px]"
                      >
                        <Icon />
                        <span className="flex-1 whitespace-nowrap transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
                          {item.title}
                        </span>
                        {item.attention ? (
                          <>
                            {/* Folded, the dot moves onto the icon so it is still seen. */}
                            <span
                              aria-hidden="true"
                              className="size-2.5 shrink-0 rounded-full bg-health-warning-dot ring-2 ring-sidebar group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1.5 group-data-[collapsible=icon]:right-1.5"
                            />
                            <span className="sr-only">Needs attention</span>
                          </>
                        ) : null}
                        {!!item.badge && (
                          <span
                            key={item.badge}
                            className="civic-enter-scale flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-fill px-1.5 text-2xs font-bold text-white transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0"
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </QuietLink>
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
