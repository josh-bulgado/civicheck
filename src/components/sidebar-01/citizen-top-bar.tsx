"use client";

import { Search } from "lucide-react";
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { useModifierKeyLabel } from "~/hooks/useModifierKeyLabel";
import { ThemeToggle } from "~/components/theme-toggle";
import { openCommandPalette } from "~/components/sidebar-01/command-palette";
import { NotificationsPopover } from "~/features/notifications/components/NotificationsPopover";
import { loadPaletteDefaults } from "~/features/search/palette-defaults";
import { Kbd, KbdGroup } from "../ui/kbd";

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
export function CitizenTopBar({
  userId,
  unreadNotifications,
}: CitizenTopBarProps) {
  const { state } = useSidebar();
  const modifier = useModifierKeyLabel();
  // The search sheet lists your latest requests before you type. Hovering or
  // focusing the pill starts that load; the cache makes repeats free.
  const warmSearch = () => {
    if (userId) void loadPaletteDefaults(userId).catch(() => undefined);
  };

  return (
    <header className="hidden items-center gap-3 md:flex">
      {/* The sidebar is always open on desktop, so the trigger only shows where
          it is a sheet, or after Ctrl+B has tucked it away. */}
      <SidebarTrigger
        className={cn(
          "size-12.5 shrink-0 rounded-full border border-border-light bg-card text-portal-ink-2 hover:bg-primary-tint [&_svg]:size-5",
          state === "expanded" && "md:hidden",
        )}
      />
      <button
        type="button"
        onClick={openCommandPalette}
        onPointerEnter={warmSearch}
        onFocus={warmSearch}
        aria-label="Search services or tracking number"
        className="civic-press flex h-12.5 w-12.5 shrink-0 items-center justify-center gap-3 rounded-full bg-portal-search text-[15px] text-muted-foreground hover:text-foreground sm:w-auto sm:max-w-120 sm:min-w-0 sm:flex-auto sm:shrink sm:justify-start sm:px-5"
      >
        <Search className="size-4.75 shrink-0" aria-hidden="true" />
        <span className="hidden truncate sm:inline">
          Search services or tracking no.
        </span>
        <Kbd className="align-bottom sm:ml-auto">{modifier} + K</Kbd>
      </button>
      <div className="flex-1" aria-hidden="true" />
      <ThemeToggle />
      <NotificationsPopover userId={userId} unreadCount={unreadNotifications} />
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
