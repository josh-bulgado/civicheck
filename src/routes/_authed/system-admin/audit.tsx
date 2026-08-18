import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuditPage } from "~/features/system-admin/pages/AuditPage";
import { getAuditEvents } from "~/features/system-admin/system-admin.functions";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/system-admin/audit")({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Math.max(1, Number(s.page) || 1),
    actor: typeof s.actor === "string" ? s.actor : undefined,
    event: typeof s.event === "string" ? s.event : undefined,
    source: (s.source === "system" || s.source === "request"
      ? s.source
      : "all") as "all" | "system" | "request",
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "audit:view")
    )
      throw redirect({ to: "/dashboard" });
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAuditEvents({ data: { ...deps, pageSize: 20 } }),
  component: AuditRoute,
});

function AuditRoute() {
  const data = Route.useLoaderData();
  // Only system_audit_events is subscribed: application_logs is gated behind
  // is_ccro_staff(), which deliberately excludes system_admin, so a channel on
  // it would connect and never deliver. Request-sourced rows still arrive on
  // the next load or tab focus.
  useRealtimeRefresh({ tables: ["system_audit_events"] });
  return <AuditPage {...data} />;
}
