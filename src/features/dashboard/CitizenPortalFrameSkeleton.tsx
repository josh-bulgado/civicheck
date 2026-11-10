import {
  CITIZEN_INSET_CLASS,
  CITIZEN_MAIN_CLASS,
  CITIZEN_PANEL_CLASS,
  WORKSPACE_SIDEBAR_STYLE,
} from "~/components/sidebar-01/workspace";
import { Sidebar, SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { CitizenDashboardSkeleton } from "./CitizenDashboardSkeleton";
import type { ReactNode } from "react";
import { CiviCheckIdentity, CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { Bell, ClipboardList, Compass, LayoutDashboard, Search } from "lucide-react";
import { ThemeSwitch } from "~/components/theme-switch";

/**
 * The applicant frame while parent loaders run: fixed navigation and branding,
 * an account placeholder, and the destination's data-loading view.
 *
 * The layout renders nothing, not even its chrome, until that loader is done, so
 * without this a fresh sign-in first paints a neutral page placeholder and then
 * swaps it for the dashboard's. This is the frame the layout will draw, in the
 * layout's own sizes (see workspace.ts), so the swap only fills it in.
 */
export function CitizenPortalFrameSkeleton({ children }: { children?: ReactNode } = {}) {
  return (
    <SidebarProvider className="citizen-portal" style={WORKSPACE_SIDEBAR_STYLE}>
      <Sidebar
        collapsible="icon"
        variant="floating"
        className="p-2.5 pr-1.5"
        aria-hidden="true"
      >
        <div className="flex min-h-0 flex-1 flex-col pt-1.5 pr-2 pb-1 pl-1.5">
          {/* The mark and name */}
          <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-10">
            <CiviCheckIdentity compact prominent />
          </div>
          {/* Home, Services, My requests, Notifications */}
          <div className="flex flex-col gap-2">
            {[{ label: "Dashboard", icon: LayoutDashboard }, { label: "Browse Services", icon: Compass }, { label: "My Requests", icon: ClipboardList }, { label: "Notifications", icon: Bell }].map(({ label, icon: Icon }) => (
              <div key={label} className="flex h-12 items-center gap-4 rounded-full px-5 text-sm text-foreground"><Icon className="size-5" aria-hidden="true" />{label}</div>
            ))}
          </div>
          {/* The account card */}
          <Skeleton className="mt-auto h-15.5 w-full rounded-[22px]" />
        </div>
      </Sidebar>

      <SidebarInset className={CITIZEN_INSET_CLASS}>
        <div className={CITIZEN_PANEL_CLASS}>
          {/* A phone's top row: the mark and name, the search and the bell. */}
          <div
            className="flex items-center gap-2.5 md:hidden"
          >
            <CiviCheckIdentity compact prominent />
            <Search className="ml-auto size-5" />
            <Bell className="size-5" />
          </div>
          {/* Desktop's top bar: the search pill, then the bell, theme and seal. */}
          <div
            className="hidden items-center gap-3 md:flex"
          >
            <div className="flex h-12.5 w-full max-w-100 items-center gap-3 rounded-full bg-muted px-5 text-sm text-muted-foreground"><Search className="size-5" />Search services or tracking no.</div>
            <div className="flex-1" />
            <Bell className="size-5" />
            <ThemeSwitch />
            <CityGovernmentIdentity compact />
          </div>
          <main className={CITIZEN_MAIN_CLASS}>
            {children ?? <CitizenDashboardSkeleton />}
          </main>
        </div>
      </SidebarInset>

      {/* A phone's navigation bar. */}
      <div aria-hidden="true" className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex h-17 items-center justify-around rounded-[34px] bg-card text-[10px] font-medium md:hidden">
        {[{ label: "Dashboard", icon: LayoutDashboard }, { label: "Services", icon: Compass }, { label: "Requests", icon: ClipboardList }, { label: "Notifications", icon: Bell }].map(({ label, icon: Icon }) => (
          <span key={label} className="flex flex-col items-center gap-1"><Icon className="size-5" />{label}</span>
        ))}
      </div>
    </SidebarProvider>
  );
}
