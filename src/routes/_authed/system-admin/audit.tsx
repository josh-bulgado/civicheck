import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuditPage } from "~/features/system-admin/pages/AuditPage";
import { getAuditEvents } from "~/features/system-admin/system-admin.functions";
import { hasPermission, type Role } from "~/lib/permissions";

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
  component: () => {
    const data = Route.useLoaderData();
    return <AuditPage {...data} />;
  },
});
