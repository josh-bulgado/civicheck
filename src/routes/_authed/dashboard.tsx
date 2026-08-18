import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import { CitizenDashboard } from "~/features/dashboard/CitizenDashboard";

export const Route = createFileRoute("/_authed/dashboard")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;

    if (hasPermission(role, "dashboard:system_admin")) {
      throw redirect({
        to: "/system-admin/health",
      });
    } else if (hasPermission(role, "dashboard:admin")) {
      throw redirect({ to: "/admin" });
    } else if (hasPermission(role, "dashboard:staff")) {
      throw redirect({ to: "/staff-dashboard" });
    }
    // Applicants have no dedicated route to redirect to — this route renders
    // their dashboard directly instead.
  },
  loader: () => getMyRequestsFn(),
  component: RouteComponent,
});

function RouteComponent() {
  const requests = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  return <CitizenDashboard requests={requests} firstName={user?.firstName ?? ""} />;
}
