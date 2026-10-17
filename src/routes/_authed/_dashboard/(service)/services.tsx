import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getServices, getServiceUsageFn } from "~/features/services/services.queries";
import ServiceCatalogPage from "~/features/services/pages/ServiceCatalogPage";
import { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

type ServicesSearch = {
  /** `display_group ?? service_code` the palette focused from a search hit. */
  service?: string;
};

export const Route = createFileRoute("/_authed/_dashboard/(service)/services")({
  // The command palette deep-links a service here to open its checklist sheet.
  validateSearch: (search: Record<string, unknown>): ServicesSearch => ({
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  loader: async () => {
    const [services, scope, usage] = await Promise.all([
      getServices(),
      getMyDepartmentScopeFn(),
      // Only orders the applicant's cards; never worth failing the page for.
      getServiceUsageFn().catch((): Record<string, number> => ({})),
    ]);
    return { services, scope, usage };
  },
  // The registry only changes when an admin edits it, and those edits already
  // call `router.invalidate()`, so browsing away and back can reuse this —
  // realtime below covers the case where the edit happens while this page is
  // already open.
  staleTime: 5 * 60_000,
  component: ServicesRoute,
});

function ServicesRoute() {
  const { services, scope, usage } = Route.useLoaderData();
  const { service } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  useRealtimeRefresh({
    tables: ["services_registry", "service_requirements_metadata"],
  });

  return (
    <ServiceCatalogPage
      services={services}
      scope={scope}
      usage={usage}
      selectedService={service}
      onDismissSelectedService={() =>
        navigate({ search: {}, replace: true })
      }
    />
  );
}
