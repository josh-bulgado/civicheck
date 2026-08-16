"use client";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { LogOut, Settings, User } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function NavFooter({
  user,
}: {
  user: {
    name: string;
    email: string;
  };
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : user.name.slice(0, 2)
  ).toUpperCase();

  return (
    <SidebarFooter className="border-t border-sidebar-border p-2.5 group-data-[collapsible=icon]:p-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton
              render={
                <SidebarMenuButton
                  size="lg"
                  className="h-12 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                  tooltip={isCollapsed ? user.name : undefined}
                />
              }
            >
              <Avatar className="h-8 w-8 rounded-full shrink-0">
                <AvatarFallback
                  className="rounded-full bg-primary-soft font-bold text-primary"
                  aria-label={`${user.name} initials`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 text-left">
                  <span className="truncate text-sm font-medium leading-tight">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-sidebar-muted">
                    {user.email}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 m-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User size={16} className="opacity-80" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings size={16} className="opacity-80" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <Link to="/logout">
                <DropdownMenuItem variant="destructive">
                  <LogOut size={16} className="opacity-80" aria-hidden="true" />
                  Logout
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
