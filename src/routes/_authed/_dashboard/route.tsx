import type { CSSProperties } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
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
import { getWorkspaceDetails } from "~/components/sidebar-01/workspace";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getUnreadNotificationSummaryFn } from "~/features/notifications/notifications.queries";
import { invalidateNotificationPreview } from "~/features/notifications/notification-preview-cache";
import { invalidatePaletteDefaults } from "~/features/search/palette-defaults";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
import { WelcomeTutorial } from "~/features/onboarding/components/WelcomeTutorial";
import { ThemeScope } from "~/components/theme-scope";
import type { Role } from "~/lib/permissions";

// The citizen sidebar's column: its own width, the 10px of frame to its left and
// the 6px gap before the panel. The panel's other three sides get their 10px of
// frame from the main column's padding.
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
  const { user } = Route.useRouteContext();
  const { unreadNotifications } = Route.useLoaderData();
  const workspace = getWorkspaceDetails((user?.role ?? "applicant") as Role);
  const isCitizen = user?.role === "applicant";
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
  });

  return (
    <SidebarProvider
      className={isCitizen ? "citizen-portal" : undefined}
      style={isCitizen ? CITIZEN_SIDEBAR_STYLE : undefined}
    >
      <ThemeScope enabled={isCitizen} />
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to Main Content
      </a>
      <AppSidebar user={user} unreadNotifications={unreadNotifications} />
      {isCitizen ? (
        // 10px of frame on every side; on desktop the sidebar column already
        // carries the left one (and the 6px gap), so it is dropped while the
        // sidebar is open and comes back when Ctrl+B tucks it away.
        <SidebarInset className="min-w-0 bg-transparent p-0 md:p-2.5 md:peer-data-[state=expanded]:pl-0">
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
        <SidebarInset>
          <header className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-border-strong bg-card px-4 transition-[width,height] ease-linear sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="size-10 rounded-lg border border-border-strong bg-card shadow-xs hover:bg-surface-subtle" />
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
      )}
      {isCitizen && <CitizenBottomBar unreadNotifications={unreadNotifications} />}
      <CommandPalette userId={user?.id} />
      {/* Lives here rather than on the dashboard page so a control anywhere in
          this layout can open it with `openWelcomeTutorial()`. */}
      {isCitizen && <WelcomeTutorial />}
    </SidebarProvider>
  );
}
