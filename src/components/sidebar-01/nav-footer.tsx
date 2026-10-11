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

const CITIZEN_ROW =
  "flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold whitespace-nowrap text-sidebar-foreground hover:bg-muted";
const CITIZEN_ROW_TILE =
  "flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary";

interface NavFooterProps {
  account: AccountProfile | null;
  /** The applicant shell: account actions as visible rows, not a dropdown. */
  citizen?: boolean;
}

export function NavFooter({ account, citizen = false }: NavFooterProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  // Every entry opens the same settings dialog; null means closed.
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab | null>(
    null,
  );

  const name = account ? getDisplayName(account) : "CiviCheck User";
  const email = account?.email ?? "";
  const initials = getInitials(name);

  const settingsDialog = account && (
    <SettingsDialog
      open={settingsTab !== null}
      onOpenChange={(open) => setSettingsTab(open ? "general" : null)}
      tab={settingsTab ?? "general"}
      onTabChange={setSettingsTab}
      account={account}
    />
  );

  if (citizen) {
    return (
      <SidebarFooter className="gap-0 px-3 pt-0 pb-6">
        <button
          type="button"
          disabled={!account}
          onClick={() => setSettingsTab("profile")}
          aria-label={`${name}, open profile settings`}
          className="flex flex-col items-center gap-1 rounded-xl px-2 pt-4 pb-1 text-center hover:bg-muted"
        >
          <span
            className="mb-2 flex size-13 items-center justify-center rounded-full bg-primary-soft text-[17px] font-bold text-primary"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="max-w-full truncate text-[15px] font-semibold text-sidebar-foreground">
            {name}
          </span>
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {email}
          </span>
        </button>
        <div className="mx-2 mt-4 mb-2 h-px bg-sidebar-border" />
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            disabled={!account}
            onClick={() => setSettingsTab("general")}
            className={CITIZEN_ROW}
          >
            <span className={CITIZEN_ROW_TILE}>
              <Settings className="size-4" aria-hidden="true" />
            </span>
            Account settings
          </button>
          <Link to="/logout" className={CITIZEN_ROW}>
            <span className={CITIZEN_ROW_TILE}>
              <LogOut className="size-4" aria-hidden="true" />
            </span>
            Log out
          </Link>
        </div>

        {settingsDialog}
      </SidebarFooter>
    );
  }

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

      {settingsDialog}
    </SidebarFooter>
  );
}
