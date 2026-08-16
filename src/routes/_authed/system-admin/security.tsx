import { createFileRoute, redirect } from "@tanstack/react-router";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { SecurityCenterPage } from "~/features/system-admin/pages/SecurityCenterPage";
import { getSecurityCenter } from "~/features/system-admin/security-center.functions";
import { hasPermission, type Role } from "~/lib/permissions";

export const Route = createFileRoute("/_authed/system-admin/security")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "security:view")
    ) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getSecurityCenter(),
  staleTime: 30_000,
  pendingMs: 300,
  pendingMinMs: 250,
  pendingComponent: SecurityCenterSkeleton,
  component: SecurityRoute,
});

function SecurityRoute() {
  const data = Route.useLoaderData();
  return <SecurityCenterPage data={data} />;
}
