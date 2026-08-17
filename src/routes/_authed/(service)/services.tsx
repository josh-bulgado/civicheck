import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Files, ShieldCheck } from "lucide-react";
import ServiceCard from "~/features/services/components/ServiceCard";
import {
  ServicesToolbar,
  type CategoryFilter,
  type SortOption,
} from "~/features/services/components/ServicesToolbar";
import { getServices } from "~/features/services/services.queries";
import { getServiceCategory, getVisitBadge } from "~/features/services/service-utils";

export const Route = createFileRoute("/_authed/(service)/services")({
  loader: () => getServices(),
  staleTime: 5 * 60_000,
  component: ServicesPage,
});

const INITIAL_VISIBLE_COUNT = 9;

function ServicesPage() {
  const services = Route.useLoaderData();

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOption>("az");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

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

  const visibleServices = filteredServices.slice(0, visibleCount);
  const remainingCount = filteredServices.length - visibleServices.length;

  function updateSearchTerm(value: string) {
    setSearchTerm(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  function updateCategory(value: CategoryFilter) {
    setCategory(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  function updateSort(value: SortOption) {
    setSort(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Official CCRO services
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl">
              Browse Document Services
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Review the official checklist, prepare your documents, and send
              your request intent to the City Civil Registrar Office.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[21rem]">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <Files className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <p className="text-2xl font-extrabold text-white">{services.length}</p>
              <p className="mt-0.5 text-xs text-white/65">Services available</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <CalendarClock className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <p className="text-2xl font-extrabold text-white">{oneVisitCount}</p>
              <p className="mt-0.5 text-xs text-white/65">Finished in one visit</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="services-list-heading" className="flex flex-col gap-6">
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
          totalCount={services.length}
        />

        {visibleServices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-12 text-center">
            <p className="text-base font-bold text-foreground">No services match your search</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Try a different keyword, or clear the filters above.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleServices.map((service) => (
              <ServiceCard key={service.service_code} {...service} />
            ))}
          </div>
        )}

        {remainingCount > 0 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount(filteredServices.length)}
              className="whitespace-nowrap rounded-lg border border-control-border bg-white px-7 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-surface-subtle"
            >
              Show the remaining {remainingCount} service{remainingCount === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
