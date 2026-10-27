import { useEffect, useMemo, useState } from "react";
import { QuietLink } from "~/components/quiet-link";
import { Search, ChevronDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { useResetApplyChoices } from "~/features/apply/hooks/useApplyDraft";
import { getAllServicesWithRequirements } from "~/features/services/services.queries";
import { cachedServiceRead, invalidateServiceCache, serviceCacheKeys } from "~/features/services/services.cache";
import type { Service, ServiceRequirement } from "~/features/admin/services/services.types";
import { parseRequirementName, cleanStepText, formatPesoFee, sortChecklist } from "~/features/services/service-utils";

interface ServicesPageProps {
  selectedCode?: string;
}

type PillKey = "all" | "birth" | "marriage" | "death" | "corrections";

const pills: { key: PillKey; label: string; test?: RegExp }[] = [
  { key: "all", label: "All" },
  { key: "birth", label: "Birth", test: /birth|colb/i },
  { key: "marriage", label: "Marriage", test: /marriage/i },
  { key: "death", label: "Death", test: /death/i },
  {
    key: "corrections",
    label: "Corrections",
    test: /correction|legitimation|surname|court decree|petition|r\.?a\.?\s*904[58]|r\.?a\.?\s*10172|r\.?a\.?\s*9255/i,
  },
];

function scrollWithinPage(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - 96,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}

export default function ServicesPage({ selectedCode }: ServicesPageProps) {
  const resetApplyChoices = useResetApplyChoices();
  const [services, setServices] = useState<Service[]>([]);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePill, setActivePill] = useState<PillKey>("all");
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [conditionalOpen, setConditionalOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    let scrollTimer: number | undefined;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await cachedServiceRead(
          serviceCacheKeys.allWithRequirements(),
          getAllServicesWithRequirements,
        );
        if (cancelled) return;
        setServices(data.services as Service[]);
        setRequirements(data.requirements as ServiceRequirement[]);

        setExpandedCodes(selectedCode ? { [selectedCode]: true } : {});
        if (selectedCode) {
          scrollTimer = window.setTimeout(() => scrollWithinPage(`service-${selectedCode}`), 300);
        }
      } catch {
        if (!cancelled) setError("We couldn't load the requirements list. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
      window.clearTimeout(scrollTimer);
    };
  }, [selectedCode, reloadToken]);

  const requirementsByService = useMemo(() => {
    const map = new Map<string, ServiceRequirement[]>();
    for (const service of services) {
      const groupOrCode = service.requirement_group ?? service.service_code;
      const applicable = sortChecklist(
        requirements.filter((requirement) =>
          requirement.service_code === groupOrCode || requirement.requirement_group === groupOrCode,
        ),
      );
      // A document shared by several cases only needs one row in the public overview.
      const uniqueDocuments = new Map<string, ServiceRequirement>();
      for (const requirement of applicable) {
        const key = requirement.requirement_name.trim().toLowerCase();
        if (!uniqueDocuments.has(key)) uniqueDocuments.set(key, requirement);
      }
      map.set(service.service_code, [...uniqueDocuments.values()]);
    }
    return map;
  }, [services, requirements]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const pill = pills.find((entry) => entry.key === activePill);
    return services.filter((service) => {
      if (pill?.test && !pill.test.test(service.name)) return false;
      if (!query) return true;
      if (
        service.name.toLowerCase().includes(query) ||
        service.service_code.toLowerCase().includes(query) ||
        service.display_name?.toLowerCase().includes(query)
      ) return true;
      return (requirementsByService.get(service.service_code) ?? []).some(
        (requirement) => requirement.requirement_name.toLowerCase().includes(query),
      );
    });
  }, [services, requirementsByService, searchQuery, activePill]);

  return (
    <div className="public-service-page">
      <SiteHeader />
      <main className="public-requirements-main">
        <h1 className="public-page-title">List of requirements</h1>

        <InputGroup className="requirements-search">
          <InputGroupInput
            type="search"
            aria-label="Search for a service or requirement"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for a service or requirement"
          />
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
        </InputGroup>

        <ToggleGroup
          aria-label="Filter services by category"
          value={[activePill]}
          onValueChange={(values: string[]) => {
            const nextPill = pills.find((pill) => pill.key === values[0]);
            if (nextPill) setActivePill(nextPill.key);
          }}
          variant="outline"
          size="lg"
          spacing={2}
          className="requirements-filters"
        >
          {pills.map((pill) => (
            <ToggleGroupItem key={pill.key} value={pill.key} className="requirements-filter">
              {pill.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {loading && (
          <div role="status" aria-label="Loading requirements" className="space-y-3">
            {[0, 1, 2].map((index) => <Skeleton key={index} className="h-22 rounded-3xl" />)}
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load services</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                invalidateServiceCache(serviceCacheKeys.allWithRequirements());
                setReloadToken((current) => current + 1);
              }}
            >Try again</Button>
          </Alert>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <Empty className="rounded-3xl border">
            <EmptyHeader>
              <EmptyTitle>No services found</EmptyTitle>
              <EmptyDescription>Try clearing the search or filters and browse the full list instead.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!loading && !error && (
          <p className="sr-only" role="status">{filteredServices.length} services found</p>
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <div className="requirements-list">
            {filteredServices.map((service) => {
              const isExpanded = !!expandedCodes[service.service_code];
              const isConditionalOpen = !!conditionalOpen[service.service_code];
              const serviceReqs = requirementsByService.get(service.service_code) ?? [];
              const mandatoryReqs = serviceReqs.filter((requirement) => requirement.is_mandatory);
              const conditionalReqs = serviceReqs.filter((requirement) => !requirement.is_mandatory);
              const cleanedSteps = (service.steps_description ?? []).map(cleanStepText).filter(Boolean);
              const applicationCode = service.display_group ?? service.service_code;

              return (
                <Collapsible
                  key={service.service_code}
                  id={`service-${service.service_code}`}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedCodes((previous) => ({ ...previous, [service.service_code]: open }))}
                  className="requirement-service"
                  data-expanded={isExpanded}
                >
                  <h2>
                    <CollapsibleTrigger render={<button type="button" className="requirement-service-trigger" />}>
                      <span>{service.name}</span>
                      <span className="requirement-chevron" aria-hidden="true"><ChevronDown /></span>
                    </CollapsibleTrigger>
                  </h2>

                  <CollapsibleContent>
                    <div className="requirement-details">
                      <dl className="requirement-facts">
                        <div>
                          <dt>Total fees</dt>
                          <dd className="requirement-fee">{formatPesoFee(service.fee, service.display_group)}</dd>
                          <dd className="requirement-fee-note">Pay at the CCRO cashier</dd>
                        </div>
                        <div>
                          <dt>Time at the office</dt>
                          <dd className="requirement-processing-time">{service.processing_time || "Varies"}</dd>
                        </div>
                      </dl>

                      <section className="requirement-documents-section" aria-label={`Required documents for ${service.name}`}>
                        <h3>Required documents ({mandatoryReqs.length})</h3>
                        <RequirementDocuments requirements={mandatoryReqs} />
                      </section>

                      {conditionalReqs.length > 0 && (
                        <Collapsible
                          open={isConditionalOpen}
                          onOpenChange={(open) => setConditionalOpen((previous) => ({ ...previous, [service.service_code]: open }))}
                          className="requirement-conditional"
                        >
                          <h3>
                            <CollapsibleTrigger render={<button type="button" className="requirement-conditional-trigger" />}>
                              Only if it applies to you ({conditionalReqs.length})
                              <ChevronDown className={isConditionalOpen ? "rotate-180" : ""} aria-hidden="true" />
                            </CollapsibleTrigger>
                          </h3>
                          <CollapsibleContent>
                            <RequirementDocuments requirements={conditionalReqs} startIndex={mandatoryReqs.length} />
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {cleanedSteps.length > 0 && (
                        <section className="requirement-office-steps" aria-label={`Office process for ${service.name}`}>
                          <h3>What happens at the office</h3>
                          <ol>
                            {cleanedSteps.map((step, index) => (
                              <li key={index}>
                                <span className="requirement-office-number" aria-hidden="true">{index + 1}</span>
                                <p>{step}</p>
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}

                      <div className="requirement-apply">
                        <div>
                          <h3>Ready to file this online?</h3>
                          <p>Sign in to apply, or create a free account.</p>
                        </div>
                        <div className="requirement-apply-actions">
                          <QuietLink to="/login" search={{ redirect: "/requirements" }} className="landing-button requirement-save">
                            Save checklist
                          </QuietLink>
                          <QuietLink
                            to="/apply/$serviceCode/case"
                            params={{ serviceCode: applicationCode }}
                            onClick={() => resetApplyChoices(applicationCode)}
                            className="landing-button landing-button-primary"
                          >Start application</QuietLink>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function RequirementDocuments({
  requirements,
  startIndex = 0,
}: {
  requirements: ServiceRequirement[];
  startIndex?: number;
}) {
  if (requirements.length === 0) {
    return <p className="requirement-empty">No specific required documents are listed for this service.</p>;
  }

  return (
    <ol className="requirement-documents" start={startIndex + 1}>
      {requirements.map((requirement, index) => {
        const { primary, secondary } = parseRequirementName(requirement.requirement_name);
        return (
          <li key={requirement.id}>
            <span className="requirement-document-number" aria-hidden="true">{startIndex + index + 1}</span>
            <div>
              <p>{primary}</p>
              {secondary ? <p className="requirement-document-note">{secondary}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
