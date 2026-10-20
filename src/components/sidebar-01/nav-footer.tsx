"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { ChevronsUpDown, Lock, LogOut, Settings, User } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { SettingsDialog } from "~/features/account/components/SettingsDialog";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
  type SettingsTab,
} from "~/features/account/account.types";

interface NavFooterProps {
  account: AccountProfile | null;
  /** The applicant shell: one user card that opens a Settings / Log out menu. */
  citizen?: boolean;
}

export function NavFooter({ account, citizen = false }: NavFooterProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  // Every entry opens the same settings dialog; null means closed.
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab | null>(
    null,
  );

  const name = account ? getDisplayName(account) : "CiviCheck User";
  const email = account?.email ?? "";
  const initials = getInitials(name);
  // The calm user card shows the first name only; an account without one falls
  // back to the full display name rather than an empty card.
  const firstName = account?.firstName.trim() || name;

  const settingsDialog = account && (
    <SettingsDialog
      open={settingsTab !== null}
      onOpenChange={(open) => setSettingsTab(open ? "profile" : null)}
      tab={settingsTab ?? "profile"}
      onTabChange={setSettingsTab}
      account={account}
    />
  );

  if (citizen) {
    // The whole card is the menu's trigger. The menu opens upward and is as
    // wide as the card, so the two read as one piece. Its items sit in the
    // popup's own portal, outside `.citizen-portal`, so they use explicit
    // colours rather than the portal's remapped tokens. Folded to the icon rail
    // the card keeps its place and loses its fill, the name fades, and a tooltip
    // carries it instead.
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
                {account?.avatarUrl ? (
                  <AvatarImage src={account.avatarUrl} alt="" />
                ) : null}
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
            <TooltipContent
              side="right"
              sideOffset={12}
              hidden={!isCollapsed || isMobile}
            >
              {name}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="flex flex-col gap-0.5 rounded-[20px] bg-card p-2 shadow-portal-menu ring-0"
          >
            {/* `!` on the gear: the item restyles every descendant's colour on
                focus, which would turn the brand-blue icon dark. */}
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

        {settingsDialog}
      </SidebarFooter>
    );
  }

  return (
    <SidebarFooter className="p-2.5">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton
              render={
                <SidebarMenuButton
                  size="lg"
                  className="h-12 pl-[11px] text-sidebar-foreground hover:bg-card/60 hover:text-foreground data-[state=open]:bg-card data-[state=open]:text-foreground"
                  tooltip={isCollapsed ? name : undefined}
                />
              }
            >
              <Avatar className="h-8 w-8 rounded-full shrink-0">
                {account?.avatarUrl ? (
                  <AvatarImage src={account.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback
                  className="rounded-full bg-primary-soft font-bold text-primary"
                  aria-label={`${name} initials`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col text-left transition-opacity duration-150 group-data-[collapsible=icon]:opacity-0">
                <span className="truncate text-sm font-medium leading-tight">
                  {name}
                </span>
                <span className="truncate text-xs text-sidebar-muted">
                  {email}
                </span>
              </div>
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
                onClick={() => setSettingsTab("security")}
              >
                <Lock size={16} className="opacity-80" aria-hidden="true" />
                Security
              </DropdownMenuItem>
              <QuietLink to="/logout">
                <DropdownMenuItem variant="destructive">
                  <LogOut size={16} className="opacity-80" aria-hidden="true" />
                  Logout
                </DropdownMenuItem>
              </QuietLink>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {settingsDialog}
    </SidebarFooter>
  );
}
