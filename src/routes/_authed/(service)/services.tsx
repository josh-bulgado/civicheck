import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, CalendarClock, Files, ShieldCheck } from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import ServiceCard from "~/features/services/components/ServiceCard";
import { ServiceDirectory } from "~/features/services/components/ServiceDirectory";
import {
  ServicesToolbar,
  type CategoryFilter,
  type SortOption,
} from "~/features/services/components/ServicesToolbar";
import { useServiceView } from "~/features/services/hooks/useServiceView";
import { getServices } from "~/features/services/services.queries";
import { getServiceCategory, getVisitBadge } from "~/features/services/service-utils";
import { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { usePermissions } from "~/hooks/usePermissions";

export const Route = createFileRoute("/_authed/(service)/services")({
  loader: async () => {
    const [services, scope] = await Promise.all([
      getServices(),
      getMyDepartmentScopeFn(),
    ]);
    return { services, scope };
  },
  // The registry only changes when an admin edits it, and those edits already
  // call `router.invalidate()`, so browsing away and back can reuse this.
  staleTime: 5 * 60_000,
  component: ServicesPage,
});

/**
 * How many services each density shows before the applicant asks for the rest.
 * A row costs a fraction of a card's height, and scanning the whole catalogue
 * in one pass is the reason to pick that density at all — so the list view
 * doesn't truncate the way the card grid does.
 */
const INITIAL_VISIBLE_COUNT = { cards: 9, rows: 30 } as const;

function ServicesPage() {
  const { services: allServices, scope } = Route.useLoaderData();
  const { view, chooseView } = useServiceView();
  const { role } = usePermissions();
  const canApply = role === "applicant";

  // Department-scoped staff (staff/supervisor) only handle their own
  // department's services — the same scoping already applied to Request
  // Queue and Walk-In Intake's service picker.
  const services = useMemo(
    () =>
      scope.isScoped
        ? allServices.filter((s) => s.department_id === scope.departmentId)
        : allServices,
    [allServices, scope],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOption>("az");
  const [showAll, setShowAll] = useState(false);

  const oneVisitCount = useMemo(
    () =>
      services.filter((s) => getVisitBadge(s.processing_time).label === "One visit")
        .length,
    [services],
  );

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const title = (service.display_name ?? service.name).toLowerCase();
      if (term && !title.includes(term)) return false;

      if (category === "all") return true;
      if (category === "one-visit") {
        return getVisitBadge(service.processing_time).label === "One visit";
      }
      return getServiceCategory(service.service_code) === category;
    });

    const sorted = [...filtered];
    if (sort === "az") {
      sorted.sort((a, b) =>
        (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name),
      );
    } else {
      sorted.sort((a, b) => Number(a.fee) - Number(b.fee));
    }

    return sorted;
  }, [services, searchTerm, category, sort]);

  const visibleServices = showAll
    ? filteredServices
    : filteredServices.slice(0, INITIAL_VISIBLE_COUNT[view]);
  const remainingCount = filteredServices.length - visibleServices.length;

  function updateSearchTerm(value: string) {
    setSearchTerm(value);
    setShowAll(false);
  }

  function updateCategory(value: CategoryFilter) {
    setCategory(value);
    setShowAll(false);
  }

  function updateSort(value: SortOption) {
    setSort(value);
    setShowAll(false);
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero civic-enter">
        <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div
                className="civic-enter-sm inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90"
                style={enterDelay(80)}
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Official CCRO services
              </div>
              {scope.isScoped && scope.departmentName && (
                <div
                  className="civic-enter-sm inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90"
                  style={enterDelay(80)}
                >
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {scope.departmentName} department
                </div>
              )}
            </div>
            <h1
              className="civic-enter-sm max-w-3xl text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl"
              style={enterDelay(140)}
            >
              {canApply ? "Browse Document Services" : "Service & Requirements Reference"}
            </h1>
            <p
              className="civic-enter-sm mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base"
              style={enterDelay(200)}
            >
              {canApply
                ? "Review the official checklist, prepare your documents, and send your request intent to the City Civil Registrar Office."
                : "Look up requirements and processing details to guide applicants and validate walk-ins at the counter."}
            </p>
          </div>

          <div className="civic-stagger grid grid-cols-2 gap-3 sm:min-w-84">
            <div
              className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              style={staggerStyle(0, 240)}
            >
              <Files className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <CountUp
                value={services.length}
                className="block text-2xl font-extrabold text-white"
              />
              <p className="mt-0.5 text-xs text-white/65">Services available</p>
            </div>
            <div
              className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              style={staggerStyle(1, 240)}
            >
              <CalendarClock className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <CountUp
                value={oneVisitCount}
                className="block text-2xl font-extrabold text-white"
              />
              <p className="mt-0.5 text-xs text-white/65">Finished in one visit</p>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="services-list-heading"
        className="civic-enter flex flex-col gap-6"
        style={enterDelay(120)}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
            Service directory
          </p>
          <h2 id="services-list-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Select a document service
          </h2>
        </div>

        <ServicesToolbar
          searchTerm={searchTerm}
          onSearchTermChange={updateSearchTerm}
          category={category}
          onCategoryChange={updateCategory}
          sort={sort}
          onSortChange={updateSort}
          view={view}
          onViewChange={chooseView}
          totalCount={services.length}
        />

        {visibleServices.length === 0 ? (
          <div className="civic-enter-scale rounded-xl border border-dashed border-border-strong bg-white px-6 py-12 text-center">
            <p className="text-base font-bold text-foreground">No services match your search</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Try a different keyword, or clear the filters above.
            </p>
          </div>
        ) : view === "rows" ? (
          <ServiceDirectory services={visibleServices} canApply={canApply} />
        ) : (
          // Cards keep their `service_code` key across filter changes, so React
          // reuses the existing nodes and only genuinely new cards animate in —
          // the cascade doesn't replay on every keystroke in the search box.
          <div className="civic-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleServices.map((service, index) => (
              <ServiceCard
                key={service.service_code}
                style={staggerStyle(index)}
                canApply={canApply}
                {...service}
              />
            ))}
          </div>
        )}

        {remainingCount > 0 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="civic-press whitespace-nowrap rounded-lg border border-control-border bg-white px-7 py-3.5 text-base font-bold text-foreground hover:bg-surface-subtle"
            >
              Show the remaining {remainingCount} service{remainingCount === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
