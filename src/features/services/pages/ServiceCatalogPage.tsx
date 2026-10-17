import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, CalendarClock, Files, ShieldCheck } from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { Button } from "~/components/ui/button";
import { PortalRequirementsDialog } from "~/features/services/components/PortalRequirementsDialog";
import { PortalServiceCard } from "~/features/services/components/PortalServiceCard";
import ServiceCard from "~/features/services/components/ServiceCard";
import { ServiceDirectory } from "~/features/services/components/ServiceDirectory";
import { ServiceRequirementsDialog } from "~/features/services/components/ServiceRequirementsDialog";
import {
  PortalServicesToolbar,
  ServicesToolbar,
  type CategoryFilter,
  type SortOption,
} from "~/features/services/components/ServicesToolbar";
import { useServiceView } from "~/features/services/hooks/useServiceView";
import type { ServiceSummary } from "~/features/services/services.queries";
import {
  getServiceCategory,
  getVisitBadge,
} from "~/features/services/service-utils";
import type { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { useResetApplyChoices } from "~/features/apply/hooks/useApplyDraft";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";

/**
 * How many services each density shows before the applicant asks for the rest.
 * A row costs a fraction of a card's height, and scanning the whole catalogue
 * in one pass is the reason to pick that density at all — so the list view
 * doesn't truncate the way the card grid does.
 */
const INITIAL_VISIBLE_COUNT = { cards: 9, rows: 30 } as const;

interface ServiceCatalogPageProps {
  services: ServiceSummary[];
  scope: Awaited<ReturnType<typeof getMyDepartmentScopeFn>>;
  /** Requests per card, keyed by `display_group ?? service_code`: "Most used first". */
  usage: Record<string, number>;
  /** `display_group ?? service_code` deep-linked from the command palette. */
  selectedService?: string;
  onDismissSelectedService?: () => void;
}

export default function ServiceCatalogPage({
  services: allServices,
  scope,
  usage,
  selectedService,
  onDismissSelectedService,
}: ServiceCatalogPageProps) {
  const { view, chooseView } = useServiceView();
  const { role } = usePermissions();
  const navigate = useNavigate();
  const resetApplyChoices = useResetApplyChoices();
  const canApply = role === "applicant";
  // The deep-linked checklist matches whichever directory it opens over.
  const Checklist = canApply ? PortalRequirementsDialog : ServiceRequirementsDialog;

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

  // The service the command palette deep-linked, if it's in this scoped
  // catalogue. Used to open its checklist sheet straight away.
  const focusedService = useMemo(
    () =>
      selectedService
        ? services.find(
            (service) =>
              (service.display_group ?? service.service_code) ===
              selectedService,
          )
        : undefined,
    [services, selectedService],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  // The applicant's directory opens on what other people ask for most; staff
  // keep their alphabetical reference.
  const [sort, setSort] = useState<SortOption>(canApply ? "popular" : "az");
  const [showAll, setShowAll] = useState(false);

  const oneVisitCount = useMemo(
    () =>
      services.filter(
        (s) => getVisitBadge(s.processing_time).label === "One visit",
      ).length,
    [services],
  );

  // Counts always reflect the department-scoped catalogue as a whole, not the
  // currently-filtered view — same reasoning as the request queue's stage
  // tabs: switching categories should never make a category look emptier
  // than it actually is.
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: services.length,
      birth: 0,
      marriage: 0,
      death: 0,
      copies: 0,
      corrections: 0,
      "one-visit": oneVisitCount,
    };
    for (const service of services) {
      const category = getServiceCategory(service.department_id);
      if (category) counts[category] += 1;
    }
    return counts;
  }, [services, oneVisitCount]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const title = (service.display_name ?? service.name).toLowerCase();
      if (term && !title.includes(term)) return false;

      if (category === "all") return true;
      if (category === "one-visit") {
        return getVisitBadge(service.processing_time).label === "One visit";
      }
      return getServiceCategory(service.department_id) === category;
    });

    const byName = (a: ServiceSummary, b: ServiceSummary) =>
      (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name);
    const used = (service: ServiceSummary) =>
      usage[service.display_group ?? service.service_code] ?? 0;

    const sorted = [...filtered];
    if (sort === "popular") {
      // Ties (and a catalogue nobody has used yet) fall back to A to Z.
      sorted.sort((a, b) => used(b) - used(a) || byName(a, b));
    } else if (sort === "az") {
      sorted.sort(byName);
    } else {
      sorted.sort((a, b) => Number(a.fee) - Number(b.fee) || byName(a, b));
    }

    return sorted;
  }, [services, searchTerm, category, sort, usage]);

  // The applicant sees every service at once and scrolls; the saved Cards/List
  // choice only decides how much staff see before asking for the rest.
  const visibleServices =
    canApply || showAll
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

  const noMatches = (
    <div className="civic-enter-scale rounded-[14px] border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-base font-bold text-foreground">
        No services match your search
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Try a different keyword, or clear the filters above.
      </p>
    </div>
  );

  // The applicant's directory: category pills with a sort, then every service in
  // a grid that simply scrolls. It answers to the width of the panel it sits in,
  // not the window's, because the sidebar takes a fixed share of the window.
  const portalDirectory = (
    <>
      <PortalServicesToolbar
        searchTerm={searchTerm}
        onSearchTermChange={updateSearchTerm}
        category={category}
        onCategoryChange={updateCategory}
        sort={sort}
        onSortChange={updateSort}
      />

      {visibleServices.length === 0 ? (
        <div className="civic-enter-scale flex flex-col items-center gap-4 rounded-[28px] bg-card px-6 py-14 text-center shadow-portal-card">
          <p className="text-lg font-semibold text-foreground">
            No services in this category
          </p>
          <button
            type="button"
            onClick={() => updateCategory("all")}
            className={cn(pillButton.light, "h-11 shadow-portal-card")}
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="@container">
          <div className="civic-stagger grid grid-cols-1 gap-4.5 md:gap-5 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
            {visibleServices.map((service, index) => (
              <PortalServiceCard
                key={service.service_code}
                style={staggerStyle(index)}
                {...service}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Staff toolbar, results and "show the rest": the same in both of their
  // densities, only the card around it differs.
  const directory = (
    <>
      <ServicesToolbar
        searchTerm={searchTerm}
        onSearchTermChange={updateSearchTerm}
        category={category}
        onCategoryChange={updateCategory}
        sort={sort}
        onSortChange={updateSort}
        view={view}
        onViewChange={chooseView}
        categoryCounts={categoryCounts}
      />

      {visibleServices.length === 0 ? (
        noMatches
      ) : view === "rows" ? (
        <ServiceDirectory services={visibleServices} canApply={canApply} />
      ) : (
        // Cards keep their `service_code` key across filter changes, so React
        // reuses the existing nodes and only genuinely new cards animate in —
        // the cascade doesn't replay on every keystroke in the search box.
        <div className="civic-stagger grid grid-cols-[repeat(auto-fill,minmax(min(325px,100%),1fr))] gap-3">
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
        <Button
          type="button"
          variant="outline"
          className={cn(pillButton.outline, "self-start")}
          onClick={() => setShowAll(true)}
        >
          Show the remaining {remainingCount} service
          {remainingCount === 1 ? "" : "s"}
        </Button>
      )}
    </>
  );

  return (
    <div className={canApply ? "portal-page gap-4.5 md:gap-6" : "dashboard-page"}>
      {canApply ? (
        <>
          <h1 className="portal-title">Browse services</h1>

          <section
            aria-label="Select a document service"
            className="flex flex-col gap-4.5 md:gap-5"
          >
            {portalDirectory}
          </section>
        </>
      ) : (
        <>
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
                  Service & Requirements Reference
                </h1>
                <p
                  className="civic-enter-sm mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base"
                  style={enterDelay(200)}
                >
                  Look up requirements and processing details to guide
                  applicants and validate walk-ins at the counter.
                </p>
              </div>

              <div className="civic-stagger grid grid-cols-2 gap-3 sm:min-w-84">
                <div
                  className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                  style={staggerStyle(0, 240)}
                >
                  <Files
                    className="mb-3 size-5 text-brand-gold"
                    aria-hidden="true"
                  />
                  <CountUp
                    value={services.length}
                    className="block text-2xl font-extrabold text-white"
                  />
                  <p className="mt-0.5 text-xs text-white/65">
                    Services available
                  </p>
                </div>
                <div
                  className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                  style={staggerStyle(1, 240)}
                >
                  <CalendarClock
                    className="mb-3 size-5 text-brand-gold"
                    aria-hidden="true"
                  />
                  <CountUp
                    value={oneVisitCount}
                    className="block text-2xl font-extrabold text-white"
                  />
                  <p className="mt-0.5 text-xs text-white/65">
                    Finished in one visit
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section
            aria-labelledby="services-list-heading"
            className="civic-enter"
            style={enterDelay(120)}
          >
            <div className="dashboard-panel overflow-hidden">
              <div className="border-b border-border px-5 py-5 sm:px-6">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
                  Service directory
                </p>
                <h2
                  id="services-list-heading"
                  className="mt-1 text-xl font-bold tracking-tight text-foreground"
                >
                  Select a document service
                </h2>
              </div>

              <div className="flex flex-col gap-5 p-5 sm:p-6">{directory}</div>
            </div>
          </section>
        </>
      )}

      {focusedService && (
        <Checklist
          serviceCode={
            focusedService.display_group ?? focusedService.service_code
          }
          title={focusedService.display_name ?? focusedService.name}
          fee={focusedService.fee}
          displayGroup={focusedService.display_group}
          processingTime={focusedService.processing_time}
          open
          onOpenChange={(open) => {
            if (!open) onDismissSelectedService?.();
          }}
          onApply={
            canApply
              ? () => {
                  const serviceCode =
                    focusedService.display_group ?? focusedService.service_code;
                  resetApplyChoices(serviceCode);
                  navigate({
                    to: "/apply/$serviceCode/case",
                    params: { serviceCode },
                  });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
