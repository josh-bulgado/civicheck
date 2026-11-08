"use client";

import { Outlet } from "@tanstack/react-router";
import type { AccountProfile } from "~/features/account/account.types";
import { SidebarInset } from "~/components/ui/sidebar";
import { CitizenBottomBar } from "./citizen-bottom-bar";
import { CitizenMobileHeader } from "./citizen-mobile-header";
import { CitizenTopBar } from "./citizen-top-bar";
import {
  CITIZEN_INSET_CLASS,
  CITIZEN_MAIN_CLASS,
  CITIZEN_PANEL_CLASS,
} from "./workspace";

/** Applicant-only chrome, kept out of internal dashboard routes. */
export function CitizenDashboardShell({
  account,
  unreadNotifications,
}: {
  account: AccountProfile | null;
  unreadNotifications: number;
}) {
  const userId = account?.id ?? "";

  return (
    <>
      <SidebarInset className={CITIZEN_INSET_CLASS}>
        <div className={CITIZEN_PANEL_CLASS}>
          <CitizenMobileHeader
            account={account}
            userId={userId}
            unreadNotifications={unreadNotifications}
          />
          <CitizenTopBar
            userId={userId}
            unreadNotifications={unreadNotifications}
          />
          <main id="main-content" tabIndex={-1} className={CITIZEN_MAIN_CLASS}>
            <Outlet />
          </main>
        </div>
      </SidebarInset>
      <CitizenBottomBar unreadNotifications={unreadNotifications} />
    </>
  );
}
