import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ServiceGroupApplicationPage } from "~/features/admin/services/components/ServiceGroupApplicationPage";
import { ServiceGroupPage } from "~/features/admin/services/components/ServiceGroupPage";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";

export const Route = createFileRoute(
  "/_authed/_dashboard/admin/services_/groups/$displayGroup",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    scope: search.scope === "application" ? search.scope : undefined,
  }),
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;
    if (!hasPermission(role, "services:manage")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params: { displayGroup } }) => {
    const services = await getAdminServices();
    const variants = services.filter(
      (service) => service.display_group === displayGroup,
    );
    if (variants.length < 2) throw notFound();

    // Every service card a timing mismatch can route to: one entry per display
    // group, plus each standalone service keyed by its own code.
    const targetOptions = new Map<string, string>();
    for (const service of services) {
      const key = service.display_group ?? service.service_code;
      if (targetOptions.has(key)) continue;
      targetOptions.set(key, service.display_name ?? service.name);
    }

    return {
      variants,
      targetOptions: [...targetOptions].map(([value, label]) => ({
        value,
        label,
      })),
    };
  },
  component: ServiceGroupRoute,
});

function ServiceGroupRoute() {
  const { variants, targetOptions } = Route.useLoaderData();
  const { scope } = Route.useSearch();

  return scope === "application" ? (
    <ServiceGroupApplicationPage
      variants={variants}
      targetOptions={targetOptions}
    />
  ) : (
    <ServiceGroupPage variants={variants} />
  );
}
