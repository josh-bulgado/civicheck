import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import ServicesPage from "~/features/admin/services/pages/ServicesPage";

export const Route = createFileRoute("/_authed/admin/services")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;
    if (!hasPermission(role, "services:manage")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getAdminServices(),
  component: AdminServicesRoute,
});

function AdminServicesRoute() {
  const services = Route.useLoaderData();
  return <ServicesPage services={services} />;
}
