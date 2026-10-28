import { useRouterState } from "@tanstack/react-router";
import { peekCurrentUser } from "~/features/auth/current-user";
import { CitizenPortalFrameSkeleton } from "~/features/dashboard/CitizenPortalFrameSkeleton";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { PageSkeleton } from "./PageSkeleton";
import { Sidebar, SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { WORKSPACE_SIDEBAR_STYLE } from "~/components/sidebar-01/workspace";

/** Parent loaders (including session restoration) use the destination's tiles. */
export function RoutePendingSkeleton() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Signing in goes to /dashboard, and everyone but an applicant is sent on
  // from there to their own home. So only an account known to be an applicant's
  // gets the applicant's frame; anyone else, or no one known yet, keeps the
  // neutral page rather than a frame that is about to be replaced.
  if (pathname === "/dashboard" && peekCurrentUser()?.role === "applicant") {
    return <CitizenPortalFrameSkeleton />;
  }

  const health = pathname === "/system-admin/health";
  const security = pathname === "/system-admin/security";
  if (!health && !security) return <PageSkeleton />;

  return (
    <SidebarProvider
      className="workspace-frame"
      style={WORKSPACE_SIDEBAR_STYLE}
      data-health-workspace={health || undefined}
      data-security-workspace={security || undefined}
    >
      <Sidebar collapsible="icon" variant="floating" className="p-2.5 pr-1.5" aria-hidden="true">
        <div className="flex flex-1 flex-col gap-5 px-4 py-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-6 h-4 w-28" />
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full rounded-full" />)}
          <Skeleton className="mt-auto h-16 w-full rounded-2xl" />
        </div>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
        <div className="flex w-full flex-1 flex-col bg-workspace md:rounded-panel md:shadow-portal-panel">
          <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <Skeleton className="h-4 w-52 max-w-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </header>
          <main id="main-content" className="civic-workspace flex flex-1 flex-col px-4 pt-1 pb-4 text-foreground sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {health ? <SystemHealthSkeleton /> : <SecurityCenterSkeleton />}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
