import { createFileRoute } from "@tanstack/react-router";
import { getServices } from "~/features/services/services.queries";
import ServiceCatalogPage from "~/features/services/pages/ServiceCatalogPage";
import { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/_dashboard/(service)/services")({
  loader: async () => {
    const [services, scope] = await Promise.all([
      getServices(),
      getMyDepartmentScopeFn(),
    ]);
    return { services, scope };
  },
  // The registry only changes when an admin edits it, and those edits already
  // call `router.invalidate()`, so browsing away and back can reuse this —
  // realtime below covers the case where the edit happens while this page is
  // already open.
  staleTime: 5 * 60_000,
  component: ServicesRoute,
});

function ServicesRoute() {
  const { services, scope } = Route.useLoaderData();
  useRealtimeRefresh({
    tables: ["services_registry", "service_requirements_metadata"],
  });

  return <ServiceCatalogPage services={services} scope={scope} />;
}
