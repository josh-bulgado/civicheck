import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { ServiceFormPage } from "~/features/admin/services/components/ServiceFormPage";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";

export const Route = createFileRoute(
  "/_authed/_dashboard/admin/services_/new",
)({
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
  component: NewServiceRoute,
});

function NewServiceRoute() {
  const { services, departments } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <ServiceFormPage
      services={services}
      departments={departments}
      onSaved={() => navigate({ to: "/admin/services" })}
    />
  );
}
