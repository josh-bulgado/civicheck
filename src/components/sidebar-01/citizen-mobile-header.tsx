"use client";

import { useLocation } from "@tanstack/react-router";
import { QuietLink } from "~/components/quiet-link";
import { Search } from "lucide-react";
import { openCommandPalette } from "~/components/sidebar-01/command-palette";
import { NotificationBellLink } from "~/features/notifications/components/NotificationBellLink";
import { loadPaletteDefaults } from "~/features/search/palette-defaults";

interface CitizenMobileHeaderProps {
  /** Keys the search suggestions to the signed-in person. */
  userId: string;
  unreadNotifications: number;
}

/**
 * The phone's top row, in place of the desktop top bar: the mark and the bell.
 * The bell opens Notifications; Profile lives in the bottom navigation.
 * Home also has a search button, since
 * every other page already has its own field or none.
 */
export function CitizenMobileHeader({
  userId,
  unreadNotifications,
}: CitizenMobileHeaderProps) {
  const { pathname } = useLocation();

  return (
    <header className="flex w-full min-w-0 max-w-full items-center gap-2.5 md:hidden">
      <QuietLink
        to="/dashboard"
        aria-label="CiviCheck, back to your dashboard"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-foreground max-[420px]:gap-0"
      >
        {/* Text stand-in: the official emblem isn't cleared for use yet. */}
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-card text-[9px] font-extrabold tracking-[0.02em] text-primary"
          aria-hidden="true"
        >
          CCRO
        </span>
        <span className="truncate text-[21px] font-semibold tracking-[-0.02em] max-[420px]:hidden">
          CiviCheck
        </span>
      </QuietLink>

      {pathname === "/dashboard" ? (
        <button
          type="button"
          aria-label="Search services or tracking number"
          onClick={openCommandPalette}
          onPointerEnter={() => {
            if (userId) void loadPaletteDefaults(userId).catch(() => undefined);
          }}
          className="civic-press flex size-11 shrink-0 items-center justify-center rounded-full border border-border-light bg-card text-portal-ink-2"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      ) : null}

      <NotificationBellLink unreadCount={unreadNotifications} />
    </header>
  );
}
