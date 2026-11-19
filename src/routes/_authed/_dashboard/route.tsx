import * as React from "react";
import { QuietAnchor } from "~/components/quiet-link";
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
import { CommandPalette } from "~/components/sidebar-01/command-palette";
import { RouteContentSkeleton } from "~/components/feedback/RouteContentSkeleton";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { ThemeSwitch } from "~/components/theme-switch";
import { DashboardBreadcrumbs } from "~/components/sidebar-01/dashboard-breadcrumbs";
import { WORKSPACE_SIDEBAR_STYLE } from "~/components/sidebar-01/workspace";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getUnreadNotificationSummaryFn } from "~/features/notifications/notifications.queries";
import { invalidateNotificationPreview } from "~/features/notifications/notification-preview-cache";
import {
  announceNotification,
  isNewArrival,
} from "~/features/notifications/new-notification-toasts";
import { NewNotificationToasts } from "~/features/notifications/components/NewNotificationToasts";
import { invalidatePaletteDefaults } from "~/features/search/palette-defaults";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
import { getHealthAttention } from "~/features/system-admin/system-health.functions";
import { hasPermission, type Role } from "~/lib/permissions";

const CitizenDashboardShell = React.lazy(() =>
  import("~/components/sidebar-01/citizen-dashboard-shell").then((module) => ({
    default: module.CitizenDashboardShell,
  })),
);

const WelcomeTutorial = React.lazy(() =>
  import("~/features/onboarding/components/WelcomeTutorial").then((module) => ({
    default: module.WelcomeTutorial,
  })),
);

// Dashboard-shell layer: sidebar + top bar, for the browse/manage pages that
// benefit from persistent navigation. The apply wizard deliberately sits
// outside this layer (directly under `_authed`) so its own step rail is the
// only chrome on screen during a linear task.
export const Route = createFileRoute("/_authed/_dashboard")({
  component: DashboardLayout,
  loader: async ({ context }) => {
    // The badge must never take the whole dashboard down with it. The bell's
    // popover list is deliberately not loaded here: it is fetched when the bell
    // is used, and cached (see notification-preview-cache).
    // System Health's dot follows the same rule. Start both independent reads
    // together so neither adds a second server round trip to dashboard loads.
    const [unread, healthNeedsAttention] = await Promise.all([
      context.user && getNotificationAudience(context.user.role as Role)
        ? getUnreadNotificationSummaryFn().catch(() => null)
        : Promise.resolve(null),
      context.user && hasPermission(context.user.role as Role, "health:view")
        ? getHealthAttention().catch(() => false)
        : Promise.resolve(false),
    ]);
    return {
      healthNeedsAttention,
      unreadNotifications: unread?.count ?? 0,
      // Which requests those are about. The request list marks them "New".
      unreadRequestIds: unread?.requestIds ?? [],
    };
  },
  staleTime: 30_000,
});

// Constants, so the sidebar does not see a new array on every render.
const HEALTH_ATTENTION = ["system-health"] as const;
const NO_ATTENTION = [] as const;

function refreshPortalCaches() {
  invalidateNotificationPreview();
  invalidatePaletteDefaults();
}

function DashboardLayout() {
  // The URL changes before the outlet commits. Keep its frame with the page
  // still on screen, including while a live reading finishes during navigation.
  const isHealthPage = useRouterState({ select: (state) => state.matches.some((match) => match.routeId === "/_authed/_dashboard/system-admin/health") });
  const isSecurityPage = useRouterState({ select: (state) => state.matches.some((match) => match.routeId === "/_authed/_dashboard/system-admin/security") });
  const isServiceEditor = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) =>
          match.routeId ===
            "/_authed/_dashboard/admin/services_/$serviceCode/edit" ||
          match.routeId === "/_authed/_dashboard/admin/services_/new" ||
          // The shared application editor is the group-level twin of the
          // service editor, so it takes over the screen the same way.
          (match.routeId ===
            "/_authed/_dashboard/admin/services_/groups/$displayGroup" &&
            (match.search as { scope?: string }).scope === "application"),
      ),
  });
  const { user } = Route.useRouteContext();
  const { unreadNotifications, healthNeedsAttention } = Route.useLoaderData();
  const isCitizen = user?.role === "applicant";
  const isCcroAdmin = user?.role === "admin";
  // Sidebar badge tracks new notifications live, from wherever the reader
  // happens to be — not just while they're on the notifications page itself.
  const audience = user ? getNotificationAudience(user.role as Role) : null;
  useRealtimeRefresh({
    tables: [audience === "staff" ? "staff_notifications" : "notifications"],
    enabled: audience !== null,
    // Only the applicant portal has the bell popover and the palette's request
    // list to keep honest. A request moving on always posts a notification, so
    // this one table is enough to know when either has gone stale.
    onChange: audience === "applicant" ? refreshPortalCaches : undefined,
    // A notification that has just arrived also pops up at the bottom right.
    onRow: (event) => {
      if (user && isNewArrival(event)) announceNotification(user.id, String(event.row.id));
    },
  });

  // The System Health dot follows incidents and the monitor's own runs, from any page.
  const canViewHealth = !!user && hasPermission(user.role as Role, "health:view");
  useRealtimeRefresh({
    tables: ["system_operational_events", "system_background_job_runs"],
    enabled: canViewHealth,
  });

  return (
    <SidebarProvider
      data-health-workspace={isHealthPage || undefined}
      data-security-workspace={isSecurityPage || undefined}
      // Both shells are a ground, a sidebar on it and one floating panel. The
      // service editor is full screen, so it keeps the plain page.
      className={
        isCitizen
          ? "citizen-portal max-w-full overflow-x-clip"
          : isServiceEditor
            ? undefined
            : "workspace-frame"
      }
      style={isServiceEditor ? undefined : WORKSPACE_SIDEBAR_STYLE}
    >
      <QuietAnchor
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to Main Content
      </QuietAnchor>
      {!isServiceEditor && (
        <AppSidebar
          user={user}
          unreadNotifications={unreadNotifications}
          attentionIds={healthNeedsAttention ? HEALTH_ATTENTION : NO_ATTENTION}
        />
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
        <React.Suspense
          fallback={
            <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
              <main
                id="main-content"
                className="civic-workspace min-w-0 w-full bg-workspace p-4 text-foreground sm:p-6 lg:p-8"
              >
                <RouteContentSkeleton />
              </main>
            </SidebarInset>
          }
        >
          <CitizenDashboardShell
            account={user ?? null}
            unreadNotifications={unreadNotifications}
          />
        </React.Suspense>
      ) : (
        // The same frame as the applicant's: the sidebar column carries the left
        // 10px, the panel floats on the ground from `md`, and on a phone the page
        // fills the screen.
        <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
          <div className={`flex min-w-0 w-full flex-1 flex-col md:rounded-panel md:shadow-portal-panel ${isCcroAdmin ? "bg-portal-panel" : "bg-workspace"}`}>
            <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                {/* From md the toggle lives in the sidebar, as in the applicant
                    shell; here it only opens the sheet on a phone. */}
                <SidebarTrigger className="size-10 shrink-0 rounded-lg border border-border-strong bg-card shadow-xs hover:bg-surface-subtle md:hidden" />
                <DashboardBreadcrumbs role={(user?.role ?? "applicant") as Role} />
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <ThemeSwitch />
                <CityGovernmentIdentity
                  compact
                  className={`${isHealthPage ? "health-city-identity " : isSecurityPage ? "security-city-identity " : ""}[&>span:first-child]:size-8 max-sm:[&>span:last-child]:hidden`}
                />
              </div>
            </header>
            <main
              id="main-content"
              tabIndex={-1}
              className="civic-workspace flex min-w-0 flex-1 flex-col px-4 pt-1 pb-4 text-foreground sm:px-6 sm:pb-6 lg:px-8 lg:pb-8"
            >
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      )}
      {user && audience && <NewNotificationToasts userId={user.id} lifted={isCitizen} />}
      <CommandPalette userId={user?.id} />
      {/* Lives here rather than on the dashboard page so a control anywhere in
          this layout can open it with `openWelcomeTutorial()`. */}
      {isCitizen && (
        <React.Suspense fallback={null}>
          <WelcomeTutorial />
        </React.Suspense>
      )}
    </SidebarProvider>
  );
}
