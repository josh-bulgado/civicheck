"use client";

import * as React from "react";
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
import { SettingsDialog } from "~/features/account/components/SettingsDialog";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
  type SettingsTab,
} from "~/features/account/account.types";

export function NavFooter({ account }: { account: AccountProfile | null }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  // Both menu entries open the same settings dialog; null means closed.
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab | null>(
    null,
  );

  const name = account ? getDisplayName(account) : "CiviCheck User";
  const email = account?.email ?? "";
  const initials = getInitials(name);

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
                  tooltip={isCollapsed ? name : undefined}
                />
              }
            >
              <Avatar className="h-8 w-8 rounded-full shrink-0">
                <AvatarFallback
                  className="rounded-full bg-primary-soft font-bold text-primary"
                  aria-label={`${name} initials`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 text-left">
                  <span className="truncate text-sm font-medium leading-tight">
                    {name}
                  </span>
                  <span className="truncate text-xs text-sidebar-muted">
                    {email}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 m-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!account}
                onClick={() => setSettingsTab("profile")}
              >
                <User size={16} className="opacity-80" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!account}
                onClick={() => setSettingsTab("general")}
              >
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

      {account && (
        <SettingsDialog
          open={settingsTab !== null}
          onOpenChange={(open) => setSettingsTab(open ? "general" : null)}
          tab={settingsTab ?? "general"}
          onTabChange={setSettingsTab}
          account={account}
        />
      )}
    </SidebarFooter>
  );
}
