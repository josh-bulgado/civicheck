import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { PortalRequirementsDialog } from "~/features/services/components/PortalRequirementsDialog";
import { PortalServiceCard } from "~/features/services/components/PortalServiceCard";
import { ServiceReferenceDesk } from "~/features/services/components/ServiceReferenceDesk";
import {
  PortalServicesToolbar,
  type CategoryFilter,
  type SortOption,
} from "~/features/services/components/ServicesToolbar";
import type { ServiceSummary } from "~/features/services/services.queries";
import { getServiceCategory } from "~/features/services/service-utils";
import type { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { useResetApplyChoices } from "~/features/apply/hooks/useApplyDraft";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";

interface ServiceCatalogPageProps {
  services: ServiceSummary[];
  scope: Awaited<ReturnType<typeof getMyDepartmentScopeFn>>;
  /** Requests per card, keyed by `display_group ?? service_code`: "Most used first". */
  usage: Record<string, number>;
  category?: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  /** `display_group ?? service_code` deep-linked from the command palette. */
  selectedService?: string;
  onSelectService: (code: string) => void;
  onDismissSelectedService?: () => void;
}

export default function ServiceCatalogPage({
  services: allServices,
  scope,
  usage,
  category = "all",
  onCategoryChange: setCategory,
  selectedService,
  onSelectService,
  onDismissSelectedService,
}: ServiceCatalogPageProps) {
  const { role } = usePermissions();
  const navigate = useNavigate();
  const resetApplyChoices = useResetApplyChoices();
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
  // The applicant's directory opens on what other people ask for most.
  const [sort, setSort] = useState<SortOption>("popular");

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const title = (service.display_name ?? service.name).toLowerCase();
      if (term && !title.includes(term)) return false;

      return (
        category === "all" ||
        getServiceCategory(service.department_id) === category
      );
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

  if (!canApply) {
    return (
      <div className="dashboard-page">
        <ServiceReferenceDesk
          services={services}
          scope={scope}
          selectedService={selectedService}
          onSelectService={onSelectService}
        />
      </div>
    );
  }

  // The applicant's directory: category pills with a sort, then every service in
  // a grid that simply scrolls. It answers to the width of the panel it sits in,
  // not the window's, because the sidebar takes a fixed share of the window.
  return (
    <div className="portal-page gap-4.5 md:gap-6">
      <h1 className="portal-title">Browse services</h1>

      <section
        aria-label="Select a document service"
        className="flex flex-col gap-4.5 md:gap-5"
      >
        <PortalServicesToolbar
          searchTerm={searchTerm}
          onSearchTermChange={(value) => setSearchTerm(value)}
          category={category}
          onCategoryChange={setCategory}
          sort={sort}
          onSortChange={setSort}
        />

        {filteredServices.length === 0 ? (
          <div className="civic-enter-scale flex flex-col items-center gap-4 rounded-[28px] bg-card px-6 py-14 text-center shadow-portal-card">
            <p className="text-lg font-semibold text-foreground">
              No services in this category
            </p>
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(pillButton.light, "h-11 shadow-portal-card")}
            >
              Show all
            </button>
          </div>
        ) : (
          <div className="@container">
            <div className="civic-stagger grid grid-cols-1 gap-4.5 md:gap-5 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
              {filteredServices.map((service, index) => (
                <PortalServiceCard
                  key={service.service_code}
                  style={staggerStyle(index)}
                  {...service}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {focusedService && (
        <PortalRequirementsDialog
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
          onApply={() => {
            const serviceCode =
              focusedService.display_group ?? focusedService.service_code;
            resetApplyChoices(serviceCode);
            navigate({
              to: "/apply/$serviceCode/case",
              params: { serviceCode },
            });
          }}
        />
      )}
    </div>
  );
}
