import {
  CITIZEN_INSET_CLASS,
  CITIZEN_MAIN_CLASS,
  CITIZEN_PANEL_CLASS,
  WORKSPACE_SIDEBAR_STYLE,
} from "~/components/sidebar-01/workspace";
import { Sidebar, SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { CitizenDashboardSkeleton } from "./CitizenDashboardSkeleton";

/**
 * The applicant's whole screen while the dashboard layout's own loader runs:
 * the sidebar, the panel with its top bar, and the dashboard's skeleton in it.
 *
 * The layout renders nothing, not even its chrome, until that loader is done, so
 * without this a fresh sign-in first paints a neutral page placeholder and then
 * swaps it for the dashboard's. This is the frame the layout will draw, in the
 * layout's own sizes (see workspace.ts), so the swap only fills it in.
 */
export function CitizenPortalFrameSkeleton() {
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
            <Skeleton className="size-10.5 shrink-0 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </div>
          {/* Home, Services, My requests, Notifications */}
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full rounded-full" />
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
            aria-hidden="true"
            className="flex items-center gap-2.5 md:hidden"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-6 w-28 flex-1 rounded-lg" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
          {/* Desktop's top bar: the search pill, then the bell, theme and seal. */}
          <div
            aria-hidden="true"
            className="hidden items-center gap-3 md:flex"
          >
            <Skeleton className="h-12.5 w-full max-w-100 rounded-full" />
            <div className="flex-1" />
            <Skeleton className="size-12.5 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-14 shrink-0 rounded-full" />
            <Skeleton className="size-12.5 shrink-0 rounded-full" />
          </div>
          <main className={CITIZEN_MAIN_CLASS}>
            <CitizenDashboardSkeleton />
          </main>
        </div>
      </SidebarInset>

      {/* A phone's navigation bar. */}
      <Skeleton
        aria-hidden="true"
        className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 h-17 rounded-[34px] md:hidden"
      />
    </SidebarProvider>
  );
}
