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
  if (citizen) {
    return (
      <SidebarMenu className="civic-stagger gap-2">
        {groups
          .flatMap((group) => group.items)
          .map((item, index) => {
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.id} style={staggerStyle(index)}>
                <QuietLink
                  to={item.url}
                  // Active is a white pill with a soft blue lift; the label
                  // keeps its ink and only the icon turns brand blue, with a
                  // faint fill inside its strokes. The explicit active+hover
                  // pairing keeps the pill opaque.
                  className={cn(
                    "group/nav civic-press flex h-13.5 items-center gap-3.5 rounded-[18px] pl-4.5 text-[15.5px] text-foreground hover:bg-card/50",
                    "data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:shadow-portal-nav-active data-[status=active]:hover:bg-card",
                    item.badge ? "pr-3.5" : "pr-4.5",
                  )}
                >
                  <Icon
                    strokeWidth={1.8}
                    className="size-5.5 shrink-0 text-portal-ink-2 group-data-[status=active]/nav:fill-primary/14 group-data-[status=active]/nav:text-primary"
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  {!!item.badge && (
                    <span
                      key={item.badge}
                      className="civic-enter-scale flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-gold px-1.75 text-[13px] font-bold text-foreground"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </QuietLink>
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
          <SidebarGroup className="px-2.5 py-2 group-data-[collapsible=icon]:px-2">
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
                      className="flex w-full items-center rounded-lg [&[data-status=active]>button]:bg-primary-soft [&[data-status=active]>button]:font-bold [&[data-status=active]>button]:text-primary"
                    >
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="civic-press h-10 w-full justify-start gap-3 rounded-lg px-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden"
                      >
                        <Icon />
                        <span className="flex-1">{item.title}</span>
                        {!!item.badge && (
                          <span
                            key={item.badge}
                            className="civic-enter-scale flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground group-data-[collapsible=icon]:hidden"
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
