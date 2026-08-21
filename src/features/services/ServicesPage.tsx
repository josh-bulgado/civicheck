import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ChevronDown, ArrowRight } from "lucide-react";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
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

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleConditional = (code: string) => {
    setConditionalOpen((prev) => ({ ...prev, [code]: !prev[code] }));
  };

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

        <div className="civic-enter relative mb-5" style={enterDelay(80)}>
          <Search className="pointer-events-none absolute left-5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a service or requirement..."
            className="h-13.5 w-full rounded-[10px] border border-control-border bg-white pl-12 pr-4 text-[17px] text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-primary/15"
          />
        </div>

        <div
          className="civic-stagger mb-8 flex flex-wrap gap-2.5"
          style={{ "--stagger-step": "40ms" } as React.CSSProperties}
        >
          {pills.map((pill, index) => {
            const active = activePill === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActivePill(pill.key)}
                style={staggerStyle(index, 120)}
                className={
                  active
                    ? "civic-press rounded-full bg-foreground px-4.5 py-2.5 text-[15px] font-bold text-white"
                    : "civic-press rounded-full border border-control-border bg-white px-4.5 py-2.5 text-[15px] text-body-strong hover:border-dashed-border hover:bg-surface-subtle"
                }
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="civic-stagger space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="civic-skeleton h-18 rounded-xl"
                style={staggerStyle(i)}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="civic-enter-scale rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="mb-3 text-sm font-medium text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => {
                invalidateServiceCache(serviceCacheKeys.allWithRequirements());
                setReloadToken((n) => n + 1);
              }}
              className="civic-press inline-flex items-center rounded-lg border border-control-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-background"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <div className="civic-enter-scale rounded-xl border border-border bg-white p-10 text-center">
            <p className="mb-1 text-sm font-semibold text-foreground">
              No services found
            </p>
            <p className="text-sm text-muted-foreground">
              Try clearing the search or filters and browse the full list
              instead.
            </p>
          </div>
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <div className="civic-stagger space-y-4">
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
                <div
                  key={service.service_code}
                  id={`service-${service.service_code}`}
                  style={staggerStyle(serviceIndex)}
                  className="civic-interactive overflow-hidden rounded-xl border border-border bg-white hover:border-border-strong hover:shadow-[0_4px_14px_rgba(23,33,43,0.06)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(service.service_code)}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left transition-colors duration-200 ${
                      isExpanded
                        ? "border-b border-border-light"
                        : "hover:bg-background"
                    }`}
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
                      className={`size-4.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  {/*
                    Animating `grid-template-rows` between 0fr and 1fr expands to
                    the content's own height. The previous `max-height: 3000px`
                    made every panel travel the same 3000px regardless of how
                    tall it actually was, so short checklists snapped open and
                    long ones appeared to stall — the timing never matched the
                    content.
                  */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-5 px-5 py-5">
                        <div className="grid grid-cols-2 divide-x divide-border-light rounded-[10px] border border-border-light">
                          <div className="flex flex-col gap-1 px-4 py-3.5">
                            <span className="text-xs text-muted-foreground">
                              Total fees
                            </span>
                            <span className="text-lg font-bold text-foreground">
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
                          <div className="flex flex-col gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                toggleConditional(service.service_code)
                              }
                              className="flex w-full items-center justify-between text-left"
                            >
                              <h4 className="text-sm font-bold text-foreground">
                                Only if it applies to you (
                                {conditionalReqs.length})
                              </h4>
                              <ChevronDown
                                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                  isConditionalOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            <div
                              className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                                isConditionalOpen
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="divide-y divide-warning-border/40 rounded-[10px] border border-warning-border bg-warning-soft">
                                  {conditionalReqs.map((req) => {
                                    const { primary, secondary } =
                                      parseRequirementName(
                                        req.requirement_name,
                                      );
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
                              </div>
                            </div>
                          </div>
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
                              className="inline-flex min-h-9 items-center rounded-lg border border-control-border bg-white px-4 text-xs font-semibold text-foreground transition-colors hover:bg-white/80"
                            >
                              Save checklist
                            </Link>
                            <Link
                              to="/apply/$serviceCode/details"
                              params={{
                                serviceCode:
                                  service.display_group ?? service.service_code,
                              }}
                              className="civic-press civic-nudge inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover"
                            >
                              Start application
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
