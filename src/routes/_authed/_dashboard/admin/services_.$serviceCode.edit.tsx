import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { ServiceFormPage } from "~/features/admin/services/components/ServiceFormPage";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";

export const Route = createFileRoute(
  "/_authed/_dashboard/admin/services_/$serviceCode/edit",
)({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;
    if (!hasPermission(role, "services:manage")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params: { serviceCode } }) => {
    const [services, departments] = await Promise.all([
      getAdminServices(),
      getActiveDepartments(),
    ]);
    const service = services.find(
      (entry) => entry.service_code === serviceCode,
    );

    if (!service) throw notFound();

    return { services, departments, service };
  },
  component: EditServiceRoute,
});

function EditServiceRoute() {
  const { services, departments, service } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const variants = service.display_group
    ? services.filter(
        (candidate) => candidate.display_group === service.display_group,
      )
    : [service];

  return (
    <ServiceFormPage
      services={services}
      departments={departments}
      service={service}
      variantOnly={variants.length > 1}
      onSaved={() =>
        variants.length > 1 && service.display_group
          ? navigate({
              to: "/admin/services/groups/$displayGroup",
              params: { displayGroup: service.display_group },
              search: { scope: undefined },
            })
          : navigate({ to: "/admin/services" })
      }
    />
  );
}
