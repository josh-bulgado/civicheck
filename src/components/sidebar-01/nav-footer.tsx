"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SidebarFooter, useSidebar } from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { SettingsDialog } from "~/features/account/components/SettingsDialog";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
  type SettingsTab,
} from "~/features/account/account.types";

/** Every role uses the same account card and Settings / Log out menu. */
export function NavFooter({ account }: { account: AccountProfile | null }) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab | null>(null);
  const name = account ? getDisplayName(account) : "CiviCheck User";
  const initials = getInitials(name);
  const firstName = account?.firstName.trim() || name;

  return (
    <SidebarFooter className="gap-0 p-0 pb-1.5">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                nativeButton
                disabled={!account}
                aria-label={`${name}, account menu`}
                className="civic-press flex w-full items-center gap-3 rounded-[22px] bg-card/78 py-2.5 pr-3.5 pl-3 text-left shadow-[0_1px_2px_rgba(15,27,45,0.05),0_8px_24px_rgba(11,77,162,0.07)] hover:bg-card/90 data-popup-open:bg-card group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-card/60"
              />
            }
          >
            <Avatar className="size-10.5" aria-hidden="true">
              {account?.avatarUrl ? <AvatarImage src={account.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-sidebar-foreground transition-opacity duration-150 group-data-[collapsible=icon]:text-clip group-data-[collapsible=icon]:opacity-0">
              {firstName}
            </span>
            <ChevronsUpDown
              className="size-5 shrink-0 text-muted-foreground transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0"
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} hidden={!isCollapsed || isMobile}>
            {name}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="flex min-w-52 flex-col gap-0.5 rounded-[20px] bg-card p-2 shadow-portal-menu ring-0"
        >
          <DropdownMenuItem
            onClick={() => setSettingsTab("profile")}
            className="h-12 gap-3 rounded-[14px] px-3.5 text-[15px] font-medium focus:bg-portal-panel"
          >
            <Settings className="size-5 text-primary!" aria-hidden="true" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            render={<QuietLink to="/logout" />}
            className="h-12 gap-3 rounded-[14px] px-3.5 text-[15px] font-medium"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {account && (
        <SettingsDialog
          open={settingsTab !== null}
          onOpenChange={(open) => setSettingsTab(open ? "profile" : null)}
          tab={settingsTab ?? "profile"}
          onTabChange={setSettingsTab}
          account={account}
        />
      )}
    </SidebarFooter>
  );
}
