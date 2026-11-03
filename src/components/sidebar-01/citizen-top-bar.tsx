"use client";

import { Search } from "lucide-react";
import {
  openCommandPalette,
  PALETTE_HOTKEY,
} from "~/components/sidebar-01/command-palette";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { ThemeSwitch } from "~/components/theme-switch";
import { NotificationsPopover } from "~/features/notifications/components/NotificationsPopover";
import { loadPaletteDefaults } from "~/features/search/palette-defaults";

interface CitizenTopBarProps {
  /** Keys the bell popover's cache, so one person's list never shows to another. */
  userId: string;
  /** Any unread at all puts the gold dot on the bell. */
  unreadNotifications: number;
}

/**
 * First row of the applicant panel, with no card behind it. One row that never
 * wraps: as the bar narrows the search pill drops its label and the seal goes,
 * leaving circles. Greeting and "How it works" live on the dashboard now.
 */
export function CitizenTopBar({ userId, unreadNotifications }: CitizenTopBarProps) {
  const hotkeyLabel = useHotkeyLabel();
  // The search sheet lists your latest requests before you type. Hovering or
  // focusing the pill starts that load; the cache makes repeats free.
  const warmSearch = () => {
    if (userId) void loadPaletteDefaults(userId).catch(() => undefined);
  };

  return (
    <header className="hidden items-center gap-3 md:flex">
      <Button
        type="button"
        variant="tonal"
        shape="pill"
        size="xl"
        onClick={openCommandPalette}
        onPointerEnter={warmSearch}
        onFocus={warmSearch}
        aria-label="Search services or tracking number"
        // Narrow it is a 50px circle with the icon; from `sm` it grows into the
        // pill with its label and shortcut.
        className="w-12.5 px-0 sm:w-auto sm:max-w-120 sm:min-w-0 sm:flex-auto sm:shrink sm:justify-start sm:px-5"
      >
        <Search className="size-4.75 shrink-0" aria-hidden="true" />
        <span className="hidden min-w-0 flex-1 truncate text-left sm:inline">
          Search services or tracking no.
        </span>
        {/* The same hint the staff sidebar's search carries. */}
        <Kbd className="hidden bg-card/70 sm:inline-flex">
          {hotkeyLabel(PALETTE_HOTKEY)}
        </Kbd>
      </Button>
      <div className="flex-1" aria-hidden="true" />
      <NotificationsPopover userId={userId} unreadCount={unreadNotifications} />
      <ThemeSwitch />
      {/* Text stand-in for the city seal, which isn't cleared for use yet. */}
      <span
        className="hidden size-12.5 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-card text-[10px] font-extrabold tracking-[0.02em] text-primary sm:flex"
        aria-hidden="true"
      >
        CITY
      </span>
    </header>
  );
}
