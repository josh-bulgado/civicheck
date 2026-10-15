"use client";

import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { QuietLink } from "~/components/quiet-link";
import { LogOut, Search, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { openCommandPalette } from "~/components/sidebar-01/command-palette";
import { SettingsDialog } from "~/features/account/components/SettingsDialog";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
  type SettingsTab,
} from "~/features/account/account.types";
import { NotificationsPopover } from "~/features/notifications/components/NotificationsPopover";
import { loadPaletteDefaults } from "~/features/search/palette-defaults";

interface CitizenMobileHeaderProps {
  account: AccountProfile | null;
  /** Keys the bell popover's cache, so one person's list never shows to another. */
  userId: string;
  unreadNotifications: number;
}

/**
 * The phone's top row, in place of the desktop top bar: the mark, the bell and
 * the person's initials. The bell opens its feed as a sheet across the screen;
 * the initials open Settings and Log out. Home also has a search button, since
 * every other page already has its own field or none.
 */
export function CitizenMobileHeader({
  account,
  userId,
  unreadNotifications,
}: CitizenMobileHeaderProps) {
  const { pathname } = useLocation();
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const name = account ? getDisplayName(account) : "CiviCheck User";

  return (
    <header className="flex items-center gap-2.5 md:hidden">
      <QuietLink
        to="/dashboard"
        aria-label="CiviCheck, back to your dashboard"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-foreground"
      >
        {/* Text stand-in: the official emblem isn't cleared for use yet. */}
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-white text-[9px] font-extrabold tracking-[0.02em] text-primary"
          aria-hidden="true"
        >
          CCRO
        </span>
        <span className="truncate text-[21px] font-semibold tracking-[-0.02em]">CiviCheck</span>
      </QuietLink>

      {pathname === "/dashboard" ? (
        <button
          type="button"
          aria-label="Search services or tracking number"
          onClick={openCommandPalette}
          onPointerEnter={() => {
            if (userId) void loadPaletteDefaults(userId).catch(() => undefined);
          }}
          className="civic-press flex size-11 shrink-0 items-center justify-center rounded-full border border-border-light bg-white text-portal-ink-2"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      ) : null}

      <NotificationsPopover userId={userId} unreadCount={unreadNotifications} />

      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          disabled={!account}
          aria-label={`${name}, account menu`}
          className="civic-press flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
        >
          {account ? getInitials(name) : ""}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="w-56 rounded-[20px] bg-white p-2 shadow-portal-menu ring-0"
        >
          <DropdownMenuItem
            onClick={() => setSettingsTab("general")}
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

      {account ? (
        <SettingsDialog
          open={settingsTab !== null}
          onOpenChange={(open) => setSettingsTab(open ? "general" : null)}
          tab={settingsTab ?? "general"}
          onTabChange={setSettingsTab}
          account={account}
        />
      ) : null}
    </header>
  );
}
