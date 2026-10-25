import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getServices, getServiceUsageFn } from "~/features/services/services.queries";
import ServiceCatalogPage from "~/features/services/pages/ServiceCatalogPage";
import { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import type { CategoryFilter } from "~/features/services/components/ServicesToolbar";

type ServicesSearch = {
  /** `display_group ?? service_code` the palette focused from a search hit. */
  service?: string;
  category?: CategoryFilter;
};

export const Route = createFileRoute("/_authed/_dashboard/(service)/services")({
  // The command palette deep-links a service here to open its checklist sheet.
  validateSearch: (search: Record<string, unknown>): ServicesSearch => ({
    service: typeof search.service === "string" ? search.service : undefined,
    category:
      search.category === "birth" ||
      search.category === "marriage" ||
      search.category === "death" ||
      search.category === "copies" ||
      search.category === "corrections"
        ? search.category
        : undefined,
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
  const { service, category } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  useRealtimeRefresh({
    tables: ["services_registry", "service_requirements_metadata"],
  });

  return (
    <ServiceCatalogPage
      services={services}
      scope={scope}
      usage={usage}
      category={category}
      onCategoryChange={(category) =>
        navigate({
          search: (prev) => ({ ...prev, category: category === "all" ? undefined : category }),
        })
      }
      selectedService={service}
      onSelectService={(code) =>
        navigate({ search: (prev) => ({ ...prev, service: code }), replace: true })
      }
      onDismissSelectedService={() =>
        navigate({ search: (prev) => ({ ...prev, service: undefined }), replace: true })
      }
    />
  );
}
