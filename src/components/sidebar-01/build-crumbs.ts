import type { Role } from "~/lib/permissions";
import { navLink, type NavItemId } from "./nav-config";
import { getWorkspaceDetails } from "./workspace";

/**
 * The breadcrumb trail above an internal page: the workspace, then where in it
 * you are. Pure (no React, no router) so the trails can be checked on their own.
 *
 * Trails are keyed by route id rather than read off the router's match chain:
 * the admin pages are flat files (`services_.blocks`), so a page's parent is not
 * one of its matches. Page names come from `nav-config.ts`, so a crumb always
 * reads the way the sidebar link does.
 */

export interface Crumb {
  label: string;
  /** Absent on the page you are on. */
  to?: string;
}

/** The part of a router match this needs. */
export interface CrumbMatch {
  routeId: string;
  loaderData?: unknown;
  search?: unknown;
}

type Trail = (role: Role, loaderData: unknown) => Crumb[];

const DASHBOARD_PREFIX = "/_authed/_dashboard";

/** A page named by its sidebar link, as the last crumb. */
const page =
  (id: NavItemId): Trail =>
  (role) => [{ label: navLink(id, role).title }];

/** A section reached from the sidebar, as a link crumb that leads back to it. */
const section = (id: NavItemId, role: Role): Crumb => {
  const { title, url } = navLink(id, role);
  return { label: title, to: url };
};

function trackingNumberOf(loaderData: unknown): string | undefined {
  if (typeof loaderData !== "object" || loaderData === null) return undefined;
  const value = (loaderData as { trackingNumber?: unknown }).trackingNumber;
  return typeof value === "string" && value ? value : undefined;
}

const TRAILS: Record<string, Trail> = {
  "/staff-dashboard": page("staff-dashboard"),
  "/notifications": page("notifications"),
  "/(service)/services": page("services"),
  "/cashier": page("cashier-counter"),
  "/payment-history": page("payment-history"),
  "/requests/": page("request-queue"),
  "/requests/$requestId": (role, loaderData) => [
    section("request-queue", role),
    { label: trackingNumberOf(loaderData) ?? "Request" },
  ],
  "/admin/": page("admin-overview"),
  "/admin/services": page("admin-services"),
  "/admin/services_/blocks": (role) => [
    section("admin-services", role),
    { label: "Shared Question Blocks" },
  ],
  "/admin/staff": page("admin-staff"),
  "/admin/reports": page("admin-reports"),
  "/system-admin/health": page("system-health"),
  "/system-admin/security": page("system-security"),
  "/system-admin/accounts": page("system-accounts"),
  "/system-admin/audit": page("system-audit"),
};

/**
 * The trail for the deepest matched page that has one, or `[]` (render nothing)
 * for a page without one. `/dashboard` redirects every role to its own home, so
 * the workspace crumb links there.
 */
export function buildCrumbs(role: Role, matches: CrumbMatch[]): Crumb[] {
  for (let index = matches.length - 1; index >= 0; index--) {
    const { routeId, loaderData, search } = matches[index];
    if (!routeId.startsWith(DASHBOARD_PREFIX)) continue;
    const trail = TRAILS[routeId.slice(DASHBOARD_PREFIX.length)];
    if (!trail) continue;

    const dataView = typeof search === "object" && search !== null && "view" in search && search.view === "data";
    const crumbs = routeId === `${DASHBOARD_PREFIX}/system-admin/health` && dataView
      ? [section("system-health", role), { label: "Data & privacy" }]
      : trail(role, loaderData);
    const workspace = getWorkspaceDetails(role).label;
    // The cashier's workspace and its page share a name; say it once.
    if (crumbs[0]?.label === workspace) return crumbs;
    return [{ label: workspace, to: "/dashboard" }, ...crumbs];
  }
  return [];
}
