import type { CSSProperties } from "react";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/sidebar-01/app-sidebar";
import { CitizenTopBar } from "~/components/sidebar-01/citizen-top-bar";
import { CommandPalette } from "~/components/sidebar-01/command-palette";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { getWorkspaceDetails } from "~/components/sidebar-01/workspace";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getUnreadNotificationCountFn } from "~/features/notifications/notifications.queries";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
import { WelcomeTutorial } from "~/features/onboarding/components/WelcomeTutorial";
import { getMyRequestCountFn } from "~/features/requests/applicant-requests.queries";
import type { Role } from "~/lib/permissions";

// The citizen sidebar is an inset card: its own width plus the 16px of ground
// to its left. The shell's right-hand gap comes from the main column's padding.
const CITIZEN_SIDEBAR_STYLE = {
  "--sidebar-width": "calc(clamp(220px, 20vw, 248px) + 1rem)",
} as CSSProperties;

// Dashboard-shell layer: sidebar + top bar, for the browse/manage pages that
// benefit from persistent navigation. The apply wizard deliberately sits
// outside this layer (directly under `_authed`) so its own step rail is the
// only chrome on screen during a linear task.
export const Route = createFileRoute("/_authed/_dashboard")({
  component: DashboardLayout,
  loader: async ({ context }) => {
    const [unreadNotifications, requestCount] = await Promise.all([
      // The badge must never take the whole dashboard down with it.
      context.user && getNotificationAudience(context.user.role as Role)
        ? getUnreadNotificationCountFn().catch(() => 0)
        : 0,
      // Only the applicant top bar's greeting reads this; null means unknown.
      context.user?.role === "applicant"
        ? getMyRequestCountFn().catch(() => null)
        : null,
    ]);
    return { unreadNotifications, requestCount };
  },
  staleTime: 30_000,
});

function DashboardLayout() {
  const isServiceEditor = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) =>
          match.routeId ===
            "/_authed/_dashboard/admin/services_/$serviceCode/edit" ||
          match.routeId === "/_authed/_dashboard/admin/services_/new",
      ),
  });
  const { user } = Route.useRouteContext();
  const { unreadNotifications, requestCount } = Route.useLoaderData();
  const workspace = getWorkspaceDetails((user?.role ?? "applicant") as Role);
  const isCitizen = user?.role === "applicant";
  // Sidebar badge tracks new notifications live, from wherever the reader
  // happens to be — not just while they're on the notifications page itself.
  const audience = user ? getNotificationAudience(user.role as Role) : null;
  useRealtimeRefresh({
    tables: [audience === "staff" ? "staff_notifications" : "notifications"],
    enabled: audience !== null,
  });

  return (
    <SidebarProvider
      className={isCitizen ? "citizen-portal" : undefined}
      style={isCitizen ? CITIZEN_SIDEBAR_STYLE : undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to Main Content
      </a>
      {!isServiceEditor && (
        <AppSidebar user={user} unreadNotifications={unreadNotifications} />
      )}
      {isServiceEditor ? (
        <main
          id="main-content"
          tabIndex={-1}
          className="civic-workspace min-w-0 w-full bg-workspace text-foreground"
        >
          <Outlet />
        </main>
      ) : isCitizen ? (
        <SidebarInset className="min-w-0 bg-ground">
          {/* One full-width column, top bar first, filling the space beside the
              sidebar. No max-width: a cap leaves dead ground on wide screens. */}
          <div className="flex w-full flex-1 flex-col gap-4 p-4">
            <CitizenTopBar
              firstName={user.firstName}
              returning={requestCount !== 0}
            />
            <main
              id="main-content"
              tabIndex={-1}
              className="civic-workspace flex flex-1 flex-col text-foreground"
            >
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      ) : (
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
            <CityGovernmentIdentity
              compact
              className="[&>span:first-child]:size-8"
            />
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="civic-workspace flex flex-1 flex-col bg-workspace p-4 text-foreground sm:p-6 lg:p-8"
          >
            <Outlet />
          </main>
        </SidebarInset>
      )}
      <CommandPalette />
      {/* Lives here rather than on the dashboard page so the top bar's "How it
          works" button can open it from any page in this layout. */}
      {isCitizen && <WelcomeTutorial />}
    </SidebarProvider>
  );
}
