import { createFileRoute, redirect } from "@tanstack/react-router";
import { SystemHealthPage } from "~/features/system-admin/pages/SystemHealthPage";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { getSystemHealth } from "~/features/system-admin/system-health.functions";
import { hasPermission, type Role } from "~/lib/permissions";

export const Route = createFileRoute("/_authed/system-admin/health")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "health:view")
    ) {
      throw redirect({ to: "/dashboard" });
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
  return <SystemHealthPage data={data} />;
}
