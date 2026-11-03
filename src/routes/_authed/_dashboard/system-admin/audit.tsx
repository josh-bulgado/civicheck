import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "~/features/system-admin/pages/AuditPage";
import { useAuditEvents } from "~/features/system-admin/hooks/useAuditEvents";
import { invalidateAuditEventsCache } from "~/features/system-admin/audit-events.cache";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { denyAccess } from "~/lib/access";

type AuditSearch = {
  page: number;
  q?: string;
  actor?: string;
  event?: string;
  source: "all" | "system" | "request" | "sign-in";
  from?: string;
  to?: string;
  /** Profile id; narrows to events performed by or targeting that account. */
  account?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authed/_dashboard/system-admin/audit")({
  validateSearch: (s: Record<string, unknown>): AuditSearch => ({
    page: Math.max(1, Math.floor(Number(s.page) || 1)),
    q: typeof s.q === "string" ? s.q.trim().slice(0, 100) : undefined,
    actor: typeof s.actor === "string" ? s.actor : undefined,
    event: typeof s.event === "string" ? s.event : undefined,
    source:
      s.source === "system" || s.source === "request" || s.source === "sign-in"
        ? s.source
        : "all",
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    account:
      typeof s.account === "string" && UUID_PATTERN.test(s.account)
        ? s.account
        : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "audit:view")
    )
      denyAccess(location);
  },
  // Filter reads are cached inside the mounted page, like the applicant service
  // views. A new query replaces the rows with a skeleton, never the whole route.
  component: AuditRoute,
});

function AuditRoute() {
  const filters = Route.useSearch();
  const { user } = Route.useRouteContext();
  const { data, isLoading, error, refresh, revalidate } = useAuditEvents(
    user!.id,
    filters,
  );
  // Audit rows, sign-ins and actor names invalidate the cached filter results.
  // Request logs are gated behind is_ccro_staff(), so those refresh on tab focus.
  useRealtimeRefresh({
    tables: ["system_audit_events", "system_security_events", "profiles"],
    onChange: invalidateAuditEventsCache,
    onRefresh: revalidate,
  });
  return (
    <AuditPage
      events={data?.events ?? []}
      total={data?.total ?? 0}
      filters={filters}
      isLoading={isLoading}
      error={error}
      onRetry={refresh}
    />
  );
}
