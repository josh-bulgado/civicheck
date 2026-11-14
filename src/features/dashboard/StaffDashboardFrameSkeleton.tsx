import { CiviCheckIdentity, CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { Sidebar, SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { WORKSPACE_SIDEBAR_STYLE } from "~/components/sidebar-01/workspace";
import { StaffDashboardSkeleton } from "./StaffDashboardSkeleton";

/** Keep the dashboard's frame while its parent loaders finish. */
export function StaffDashboardFrameSkeleton() {
  return (
    <SidebarProvider className="workspace-frame" style={WORKSPACE_SIDEBAR_STYLE}>
      <Sidebar collapsible="icon" variant="floating" className="p-2.5 pr-1.5" aria-hidden="true">
        <div className="flex min-h-0 flex-1 flex-col pt-1.5 pr-2 pb-1 pl-1.5">
          <div className="px-2.5 pt-2 pb-6">
            <CiviCheckIdentity compact prominent />
            <p className="mt-2 mb-4 h-5 text-xs font-medium text-primary">CCRO Workspace</p>
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          {["Staff Dashboard", "Notifications", "Request Queue", "Service Reference"].map((label) => (
            <div key={label} className="flex h-12 items-center rounded-full px-5 text-sm font-medium">{label}</div>
          ))}
          <Skeleton className="mt-auto h-16 w-full rounded-[22px]" />
        </div>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
        <div className="flex min-w-0 w-full flex-1 flex-col bg-workspace md:rounded-panel md:shadow-portal-panel">
          <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <span className="text-sm text-muted-foreground">CCRO Workspace / Staff Dashboard</span>
            <CityGovernmentIdentity compact className="[&>span:first-child]:size-8 max-sm:[&>span:last-child]:hidden" />
          </header>
          <main className="civic-workspace flex min-w-0 flex-1 flex-col px-4 pt-1 pb-4 text-foreground sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <StaffDashboardSkeleton />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
