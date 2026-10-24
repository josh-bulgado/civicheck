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
import { CitizenBottomBar } from "~/components/sidebar-01/citizen-bottom-bar";
import { CitizenMobileHeader } from "~/components/sidebar-01/citizen-mobile-header";
import { CitizenTopBar } from "~/components/sidebar-01/citizen-top-bar";
import { CommandPalette } from "~/components/sidebar-01/command-palette";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { ThemeSwitch } from "~/components/theme-switch";
import { DashboardBreadcrumbs } from "~/components/sidebar-01/dashboard-breadcrumbs";
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
import { WelcomeTutorial } from "~/features/onboarding/components/WelcomeTutorial";
import type { Role } from "~/lib/permissions";

// The sidebar's column, for every role: its own width, the 10px of frame to its
// left and the 6px gap before the panel. The panel's other three sides get their
// 10px of frame from the main column's padding. Folded, the column is the icon
// width plus the same 16px of frame: wide enough for a 54px pill circle with room
// to spare.
const SIDEBAR_STYLE = {
  "--sidebar-width": "calc(clamp(220px, 20vw, 248px) + 1rem)",
  "--sidebar-width-icon": "4.5rem",
} as CSSProperties;

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
    const unread =
      context.user && getNotificationAudience(context.user.role as Role)
        ? await getUnreadNotificationSummaryFn().catch(() => null)
        : null;
    return {
      unreadNotifications: unread?.count ?? 0,
      // Which requests those are about. The request list marks them "New".
      unreadRequestIds: unread?.requestIds ?? [],
    };
  },
  staleTime: 30_000,
});

function refreshPortalCaches() {
  invalidateNotificationPreview();
  invalidatePaletteDefaults();
}

function DashboardLayout() {
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
  const { unreadNotifications } = Route.useLoaderData();
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

  return (
    <SidebarProvider
      // Both shells are a ground, a sidebar on it and one floating panel. The
      // service editor is full screen, so it keeps the plain page.
      className={
        isCitizen ? "citizen-portal" : isServiceEditor ? undefined : "workspace-frame"
      }
      style={isServiceEditor ? undefined : SIDEBAR_STYLE}
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
        // 10px of frame on every side; on desktop the sidebar column already
        // carries the left one (and the 6px gap), open or folded to icons, so it
        // is dropped.
        <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
          {/* From md: one panel, top bar first, filling the space beside the
              sidebar. No max-width: a cap leaves dead ground on wide screens.
              On a phone there is no panel: the page sits on the ground with 20px
              at the sides, and 130px below it for the bottom bar. */}
          <div className="flex w-full flex-1 flex-col gap-4.5 px-5 pt-4 pb-32.5 md:gap-7 md:rounded-panel md:bg-portal-panel md:px-11 md:pt-7 md:pb-9 md:shadow-portal-panel short:md:gap-5 short:md:pt-5 short:md:pb-6">
            <CitizenMobileHeader
              account={user ?? null}
              userId={user?.id ?? ""}
              unreadNotifications={unreadNotifications}
            />
            <CitizenTopBar
              userId={user?.id ?? ""}
              unreadNotifications={unreadNotifications}
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
        // The same frame as the applicant's: the sidebar column carries the left
        // 10px, the panel floats on the ground from `md`, and on a phone the page
        // fills the screen.
        <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0">
          <div className={`flex w-full flex-1 flex-col md:rounded-panel md:shadow-portal-panel ${isCcroAdmin ? "bg-portal-panel" : "bg-workspace"}`}>
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
                  className="[&>span:first-child]:size-8 max-sm:[&>span:last-child]:hidden"
                />
              </div>
            </header>
            <main
              id="main-content"
              tabIndex={-1}
              className="civic-workspace flex flex-1 flex-col px-4 pt-1 pb-4 text-foreground sm:px-6 sm:pb-6 lg:px-8 lg:pb-8"
            >
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      )}
      {isCitizen && <CitizenBottomBar unreadNotifications={unreadNotifications} />}
      {user && audience && <NewNotificationToasts userId={user.id} lifted={isCitizen} />}
      <CommandPalette userId={user?.id} />
      {/* Lives here rather than on the dashboard page so a control anywhere in
          this layout can open it with `openWelcomeTutorial()`. */}
      {isCitizen && <WelcomeTutorial />}
    </SidebarProvider>
  );
}
