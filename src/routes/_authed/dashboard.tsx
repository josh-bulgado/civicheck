import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";

export const Route = createFileRoute("/_authed/dashboard")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;

    if (hasPermission(role, "dashboard:system_admin")) {
      throw redirect({
        to: "/system-admin/accounts",
        search: { category: "personnel", page: 1 },
      });
    } else if (hasPermission(role, "dashboard:admin")) {
      throw redirect({ to: "/admin/services" });
    } else if (hasPermission(role, "dashboard:staff")) {
      throw redirect({ to: "/staff-dashboard" });
    } else {
      throw redirect({ to: "/services" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Redirecting based on your role...</div>;
}
