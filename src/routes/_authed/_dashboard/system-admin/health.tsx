import { createFileRoute } from "@tanstack/react-router";
import { SystemHealthPage } from "~/features/system-admin/pages/SystemHealthPage";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { getSystemHealth } from "~/features/system-admin/system-health.functions";
import { hasPermission, type Role } from "~/lib/permissions";
import { denyAccess } from "~/lib/access";

type HealthSearch = { view?: "data" };

export const Route = createFileRoute("/_authed/_dashboard/system-admin/health")({
  // The Data & Privacy view can be linked to. Overview is the default and keeps the URL clean.
  validateSearch: (search: Record<string, unknown>): HealthSearch => ({
    view: search.view === "data" ? "data" : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "health:view")
    ) {
      denyAccess(location);
    }
  },
  loader: () => getSystemHealth(),
  staleTime: 30_000,
  pendingMs: 300,
  pendingMinMs: 250,
  pendingComponent: SystemHealthSkeleton,
  component: HealthRoute,
});

function HealthRoute() {
  const data = Route.useLoaderData();
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SystemHealthPage
      data={data}
      view={view === "data" ? "data" : "overview"}
      onViewChange={(next) =>
        void navigate({ search: { view: next === "data" ? "data" : undefined }, replace: true })
      }
    />
  );
}
