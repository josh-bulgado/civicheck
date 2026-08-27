import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ChevronDown, ArrowRight, PhilippinePeso } from "lucide-react";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { getAllServicesWithRequirements } from "~/features/services/services.queries";
import {
  cachedServiceRead,
  invalidateServiceCache,
  serviceCacheKeys,
} from "~/features/services/services.cache";
import type {
  Service,
  ServiceRequirement,
} from "~/features/admin/services/services.types";
import {
  parseRequirementName,
  cleanStepText,
  formatFee,
} from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

interface ServicesPageProps {
  selectedCode?: string;
}

type PillKey = "all" | "birth" | "marriage" | "death" | "corrections";

const pills: { key: PillKey; label: string; test?: RegExp }[] = [
  { key: "all", label: "All" },
  { key: "birth", label: "Birth", test: /birth/i },
  { key: "marriage", label: "Marriage", test: /marriage/i },
  { key: "death", label: "Death", test: /death/i },
  {
    key: "corrections",
    label: "Corrections",
    test: /correction|legitimation|surname|court decree|petition|r\.?a\.?\s*904[58]|r\.?a\.?\s*10172|r\.?a\.?\s*9255/i,
  },
];

const HEADER_CLEARANCE = 96;

function scrollWithinPage(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const top =
    element.getBoundingClientRect().top + window.scrollY - HEADER_CLEARANCE;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function ServicesPage({ selectedCode }: ServicesPageProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activePill, setActivePill] = useState<PillKey>("all");
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>(
    {},
  );
  const [conditionalOpen, setConditionalOpen] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let cancelled = false;

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

        if (selectedCode) {
          setExpandedCodes({ [selectedCode]: true });
          setTimeout(() => scrollWithinPage(`service-${selectedCode}`), 300);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load services", err);
        setError("We couldn't load the requirements list. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedCode, reloadToken]);

  const requirementsByService = useMemo(() => {
    const map = new Map<string, ServiceRequirement[]>();
    for (const service of services) {
      const groupOrCode = service.requirement_group ?? service.service_code;
      map.set(
        service.service_code,
        requirements.filter(
          (r) =>
            r.service_code === groupOrCode ||
            r.requirement_group === groupOrCode,
        ),
      );
    }
    return map;
  }, [services, requirements]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const pill = pills.find((p) => p.key === activePill);

    return services.filter((service) => {
      if (pill?.test && !pill.test.test(service.name)) return false;
      if (!query) return true;

      const nameMatch =
        service.name.toLowerCase().includes(query) ||
        service.service_code.toLowerCase().includes(query) ||
        (service.display_name?.toLowerCase().includes(query) ?? false);
      if (nameMatch) return true;

      const serviceReqs = requirementsByService.get(service.service_code) ?? [];
      return serviceReqs.some((r) =>
        r.requirement_name.toLowerCase().includes(query),
      );
    });
  }, [services, requirementsByService, searchQuery, activePill]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-225 flex-1 px-5 pb-14 pt-12 sm:px-8 sm:pt-14">
        <div className="civic-enter mx-auto mb-8 max-w-190 text-center">
          <h1 className="civic-title text-[clamp(1.75rem,4vw,2.625rem)] leading-tight">
            List of requirements
          </h1>
          <p className="mt-3.5 text-lg leading-relaxed text-body">
            Search or browse every civil registry service the CCRO offers, and
            see the exact documents, fees, and steps involved before you visit.
          </p>
        </div>

        <InputGroup className="civic-enter mb-5 h-13.5" style={enterDelay(80)}>
          <InputGroupInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a service or requirement..."
            className="text-[17px]"
          />
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>

        <ToggleGroup
          aria-label="Filter services by category"
          value={[activePill]}
          onValueChange={(values: string[]) => {
            const nextPill = values[0] as PillKey | undefined;
            if (nextPill) setActivePill(nextPill);
          }}
          variant="outline"
          size="lg"
          spacing={2}
          className="civic-stagger mb-8 flex flex-wrap gap-2.5"
          style={{ "--stagger-step": "40ms" } as React.CSSProperties}
        >
          {pills.map((pill, index) => (
            <ToggleGroupItem
              key={pill.key}
              value={pill.key}
              style={staggerStyle(index, 120)}
              className="rounded-full"
            >
              {pill.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {loading && (
          <div className="civic-stagger flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="h-18 rounded-xl"
                style={staggerStyle(i)}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive" className="civic-enter-scale">
            <AlertTitle>Unable to load services</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                invalidateServiceCache(serviceCacheKeys.allWithRequirements());
                setReloadToken((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </Alert>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <Empty className="civic-enter-scale border">
            <EmptyHeader>
              <EmptyTitle>No services found</EmptyTitle>
              <EmptyDescription>
                Try clearing the search or filters and browse the full list
                instead.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <div className="civic-stagger flex flex-col gap-4">
            {filteredServices.map((service, serviceIndex) => {
              const isExpanded = !!expandedCodes[service.service_code];
              const isConditionalOpen = !!conditionalOpen[service.service_code];
              const serviceReqs =
                requirementsByService.get(service.service_code) ?? [];
              const mandatoryReqs = serviceReqs.filter((r) => r.is_mandatory);
              const conditionalReqs = serviceReqs.filter(
                (r) => !r.is_mandatory,
              );
              const cleanedSteps = (service.steps_description ?? [])
                .map(cleanStepText)
                .filter((s) => s.length > 0);

              return (
                <Collapsible
                  key={service.service_code}
                  id={`service-${service.service_code}`}
                  open={isExpanded}
                  onOpenChange={(open) =>
                    setExpandedCodes((previous) => ({
                      ...previous,
                      [service.service_code]: open,
                    }))
                  }
                  style={staggerStyle(serviceIndex)}
                  className="civic-interactive overflow-hidden rounded-xl border border-border bg-white hover:border-border-strong hover:shadow-[0_4px_14px_rgba(23,33,43,0.06)]"
                >
                  <CollapsibleTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-auto w-full justify-between rounded-none px-5 py-4.5 text-left whitespace-normal",
                          isExpanded && "border-b border-border-light",
                        )}
                      />
                    }
                  >
                    <div>
                      <span className="block text-base font-bold leading-snug text-foreground">
                        {service.name}
                      </span>
                      {service.classification && (
                        <span className="mt-1 block text-xs text-muted-foreground capitalize">
                          {service.classification.replace("_", " ")} transaction
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      data-icon="inline-end"
                      className={cn(
                        "transition-transform duration-200",
                        isExpanded && "rotate-180 text-primary",
                      )}
                      aria-hidden="true"
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="flex flex-col gap-5 px-5 py-5">
                      <div className="grid grid-cols-2 divide-x divide-border-light rounded-[10px] border border-border-light">
                        <div className="flex flex-col gap-1 px-4 py-3.5">
                          <span className="text-xs text-muted-foreground">
                            Total fees
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            <PhilippinePeso />
                            {formatFee(service.fee, service.display_group)}
                          </span>
                          <span className="text-xs text-body">
                            Pay at the CCRO cashier
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 px-4 py-3.5">
                          <span className="text-xs text-muted-foreground">
                            Time at the office
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {service.processing_time || "Varies"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <h4 className="text-sm font-bold text-foreground">
                          Required documents ({mandatoryReqs.length})
                        </h4>

                        {mandatoryReqs.length === 0 ? (
                          <p className="rounded-[10px] border border-dashed border-dashed-border bg-background p-3.5 text-xs italic text-muted-foreground">
                            No specific required documents are listed for this
                            service.
                          </p>
                        ) : (
                          <div className="divide-y divide-border-lighter rounded-[10px] border border-border-light">
                            {mandatoryReqs.map((req) => {
                              const { primary, secondary } =
                                parseRequirementName(req.requirement_name);
                              return (
                                <div key={req.id} className="px-4 py-3.5">
                                  <p className="text-sm font-medium leading-snug text-body-strong">
                                    {primary}
                                  </p>
                                  {secondary && (
                                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                                      {secondary}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {conditionalReqs.length > 0 && (
                        <Collapsible
                          open={isConditionalOpen}
                          onOpenChange={(open) =>
                            setConditionalOpen((previous) => ({
                              ...previous,
                              [service.service_code]: open,
                            }))
                          }
                          className="flex flex-col gap-2.5"
                        >
                          <CollapsibleTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto w-full justify-between px-0 text-left whitespace-normal"
                              />
                            }
                          >
                            <h4 className="text-sm font-bold text-foreground">
                              Only if it applies to you (
                              {conditionalReqs.length})
                            </h4>
                            <ChevronDown
                              data-icon="inline-end"
                              className={cn(
                                "transition-transform duration-200",
                                isConditionalOpen && "rotate-180",
                              )}
                              aria-hidden="true"
                            />
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="divide-y divide-warning-border/40 rounded-[10px] border border-warning-border bg-warning-soft">
                              {conditionalReqs.map((req) => {
                                const { primary, secondary } =
                                  parseRequirementName(req.requirement_name);
                                return (
                                  <div key={req.id} className="px-4 py-3.5">
                                    <p className="text-sm font-medium leading-snug text-body-strong">
                                      {primary}
                                    </p>
                                    <p className="mt-1 text-xs leading-snug text-warning-strong">
                                      {secondary ||
                                        "Only needed if this applies to your case."}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {cleanedSteps.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h4 className="text-sm font-bold text-foreground">
                            What happens at the office
                          </h4>
                          <div className="flex flex-col gap-3">
                            {cleanedSteps.map((step, idx) => (
                              <div key={idx} className="flex gap-3">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                                  {idx + 1}
                                </span>
                                <p className="pt-0.5 text-sm leading-relaxed text-body-strong">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-border-light bg-background px-5 py-4.5">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Ready to file this online?
                          </p>
                          <p className="text-xs text-body">
                            Sign in to apply — or create a free account if you
                            don't have one yet.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link
                            to="/login"
                            search={{ redirect: "/requirements" }}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Save checklist
                          </Link>
                          <Link
                            to="/apply/$serviceCode/case"
                            params={{
                              serviceCode:
                                service.display_group ?? service.service_code,
                            }}
                            className={buttonVariants({ size: "sm" })}
                          >
                            Start application
                            <ArrowRight className="size-3.5" />
                          </Link>
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
