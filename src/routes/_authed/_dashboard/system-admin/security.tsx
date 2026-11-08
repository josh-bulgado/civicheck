import { createFileRoute } from "@tanstack/react-router";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { SecurityCenterPage } from "~/features/system-admin/pages/SecurityCenterPage";
import { getSecurityCenter } from "~/features/system-admin/security-center.functions";
import { hasPermission, type Role } from "~/lib/permissions";
import { denyAccess } from "~/lib/access";
import securityCenterCss from "~/features/system-admin/security-center.css?url";

export const Route = createFileRoute("/_authed/_dashboard/system-admin/security")({
  head: () => ({
    links: [{ rel: "stylesheet", href: securityCenterCss }],
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "security:view")
    ) {
      denyAccess(location);
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
