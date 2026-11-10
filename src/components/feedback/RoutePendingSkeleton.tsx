import { useRouterState } from "@tanstack/react-router";
import { peekCurrentUser } from "~/features/auth/current-user";
import { LoginPageSkeleton } from "~/features/auth/components/LoginPageSkeleton";
import { CitizenPortalFrameSkeleton } from "~/features/dashboard/CitizenPortalFrameSkeleton";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { RouteContentSkeleton } from "./RouteContentSkeleton";
import { Sidebar, SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { WORKSPACE_SIDEBAR_STYLE } from "~/components/sidebar-01/workspace";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { LandingPageSkeleton } from "~/features/landing/components/LandingPageSkeleton";
import { WizardPageSkeleton } from "~/features/apply/components/WizardPageSkeleton";

/** Parent loaders (including session restoration) use the destination's tiles. */
export function RoutePendingSkeleton() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/") return <LandingPageSkeleton />;
  if (pathname === "/login" || pathname === "/login/") {
    return <LoginPageSkeleton />;
  }
  if (pathname.startsWith("/apply/")) return <WizardPageSkeleton />;

  // A known applicant gets the same fixed frame on every portal destination.
  // The hint only chooses loading presentation; route guards still own access.
  if (peekCurrentUser()?.role === "applicant" && ["/dashboard", "/services", "/my-requests", "/notifications"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <CitizenPortalFrameSkeleton><RouteContentSkeleton /></CitizenPortalFrameSkeleton>;
  }

  const health = pathname === "/system-admin/health";
  const security = pathname === "/system-admin/security";
  if (!health && !security) return <RouteContentSkeleton />;

  return (
    <SidebarProvider
      className="workspace-frame"
      style={WORKSPACE_SIDEBAR_STYLE}
      data-health-workspace={health || undefined}
      data-security-workspace={security || undefined}
    >
      <Sidebar collapsible="icon" variant="floating" className="p-2.5 pr-1.5" aria-hidden="true">
        <div className="flex flex-1 flex-col gap-5 px-4 py-6">
          <CiviCheckIdentity compact prominent />
          <span className="mt-6 text-xs font-semibold text-muted-foreground">System Administration</span>
          {["System Health", "Security Center", "Accounts Center", "Audit Center"].map((item) => <span key={item} className="flex h-12 items-center rounded-full px-4 text-sm font-medium">{item}</span>)}
          <Skeleton className="mt-auto h-16 w-full rounded-2xl" />
        </div>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
        <div className="flex w-full flex-1 flex-col bg-workspace md:rounded-panel md:shadow-portal-panel">
          <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <span className="text-sm text-muted-foreground">System Administration / {health ? "System Health" : "Security Center"}</span>
          </header>
          <main id="main-content" className="civic-workspace flex flex-1 flex-col px-4 pt-1 pb-4 text-foreground sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {health ? <SystemHealthSkeleton /> : <SecurityCenterSkeleton />}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
