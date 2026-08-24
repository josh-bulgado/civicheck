import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import ServicesPage from "~/features/admin/services/pages/ServicesPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/_dashboard/admin/services")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;
    if (!hasPermission(role, "services:manage")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const [services, departments] = await Promise.all([
      getAdminServices(),
      getActiveDepartments(),
    ]);
    return { services, departments };
  },
  staleTime: 5 * 60_000,
  component: AdminServicesRoute,
});

function AdminServicesRoute() {
  const { services, departments } = Route.useLoaderData();
  useRealtimeRefresh({
    tables: [
      "services_registry",
      "service_requirements_metadata",
      "form_templates",
      "form_template_versions",
      "service_form_templates",
    ],
  });
  return <ServicesPage services={services} departments={departments} />;
}
