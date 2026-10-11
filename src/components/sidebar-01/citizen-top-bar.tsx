"use client";

import { CircleHelp, Search } from "lucide-react";
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { openCommandPalette } from "~/components/sidebar-01/command-palette";
import { openWelcomeTutorial } from "~/features/onboarding/components/WelcomeTutorial";

// Pinned to Philippine time like the notification day headings, so the
// server-rendered date and the client's always agree.
const todayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

interface CitizenTopBarProps {
  firstName: string;
  /** False for an applicant who hasn't submitted anything yet. */
  returning: boolean;
}

/**
 * First card of the applicant shell. One row that never wraps: as the bar
 * narrows the labels drop away and the controls fall back to their icons.
 */
export function CitizenTopBar({ firstName, returning }: CitizenTopBarProps) {
  const { state } = useSidebar();

  return (
    <header className="portal-card flex items-center gap-3 py-3.5 pr-4 pl-4 sm:gap-4 sm:pl-6">
      {/* The sidebar is always open on desktop, so the trigger only shows where
          it is a sheet, or after Ctrl+B has tucked it away. */}
      <SidebarTrigger
        className={cn(
          "size-11 shrink-0 rounded-full bg-muted text-foreground hover:bg-primary-soft",
          state === "expanded" && "md:hidden",
        )}
      />
      <div className="mr-auto flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[15px] font-bold text-foreground">
          {returning ? "Welcome back" : "Welcome"}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {todayFormat.format(new Date())}
        </p>
      </div>
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search services or tracking number"
        className="flex size-11 shrink-0 items-center justify-center gap-2.5 rounded-full bg-muted text-muted-foreground hover:text-foreground sm:w-auto sm:max-w-80 sm:min-w-0 sm:flex-[1_1_140px] sm:shrink sm:justify-start sm:px-4"
      >
        <Search className="size-4.5 shrink-0" aria-hidden="true" />
        <span className="hidden truncate text-sm sm:inline">
          Search services or tracking no.
        </span>
      </button>
      <button
        type="button"
        onClick={openWelcomeTutorial}
        aria-label="How it works"
        className="flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold whitespace-nowrap text-primary hover:bg-primary-tint lg:w-auto lg:px-4"
      >
        <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden lg:inline">How it works</span>
      </button>
      {/* Text stand-in for the city seal, which isn't cleared for use yet. */}
      <div className="hidden shrink-0 items-center gap-2.5 border-l border-border-light pl-4 sm:flex">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-gold bg-white text-[9px] font-extrabold tracking-[0.02em] text-primary"
          aria-hidden="true"
        >
          CITY
        </span>
        <span className="hidden text-xs font-bold tracking-widest whitespace-nowrap text-foreground uppercase xl:inline">
          City of Legazpi
        </span>
      </div>
    </header>
  );
}
