import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/sidebar-01/app-sidebar";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { getWorkspaceDetails } from "~/components/sidebar-01/workspace";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getUnreadNotificationCountFn } from "~/features/notifications/notifications.queries";
import type { Role } from "~/lib/permissions";

// Dashboard-shell layer: sidebar + top bar, for the browse/manage pages that
// benefit from persistent navigation. The apply wizard deliberately sits
// outside this layer (directly under `_authed`) so its own step rail is the
// only chrome on screen during a linear task.
export const Route = createFileRoute("/_authed/_dashboard")({
  component: DashboardLayout,
  loader: async ({ context }) => ({
    unreadNotifications:
      context.user?.role === "applicant" ? await getUnreadNotificationCountFn() : 0,
  }),
  staleTime: 30_000,
});

function DashboardLayout() {
  const { user } = Route.useRouteContext();
  const { unreadNotifications } = Route.useLoaderData();
  const workspace = getWorkspaceDetails((user?.role ?? "applicant") as Role);
  // Sidebar badge tracks new notifications live, from wherever the applicant
  // happens to be — not just while they're on the notifications page itself.
  useRealtimeRefresh({ tables: ["notifications"], enabled: user?.role === "applicant" });

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to Main Content
      </a>
      <AppSidebar user={user} unreadNotifications={unreadNotifications} />
      <SidebarInset>
        <header className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-border-strong bg-white px-4 transition-[width,height] ease-linear sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="size-10 rounded-lg border border-border-strong bg-white shadow-xs hover:bg-surface-subtle" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-foreground">
                {workspace.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {workspace.description}
              </p>
            </div>
          </div>
          <CityGovernmentIdentity compact className="[&>span:first-child]:size-8" />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="civic-workspace flex flex-1 flex-col bg-workspace p-4 text-foreground sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
