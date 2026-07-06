import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ChevronDown,
  Clock,
  CircleDollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  ClipboardList,
} from "lucide-react";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { getAllServicesWithRequirements } from "~/features/services/services.queries";
import type { Service, ServiceRequirement } from "~/features/admin/services/services.types";
import {
  parseRequirementName,
  cleanStepText,
  formatFee,
} from "~/features/services/service-utils";

interface ServicesPageProps {
  selectedCode?: string;
}

export default function ServicesPage({ selectedCode }: ServicesPageProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [conditionalOpen, setConditionalOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getAllServicesWithRequirements();
        setServices(data.services as Service[]);
        setRequirements(data.requirements as ServiceRequirement[]);
        
        // If a code is passed in URL query, expand it by default
        if (selectedCode) {
          setExpandedCodes({ [selectedCode]: true });
          // Scroll to the selected element after rendering
          setTimeout(() => {
            const element = document.getElementById(`service-${selectedCode}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 300);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load services data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCode]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const toggleConditional = (code: string) => {
    setConditionalOpen((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Filter services based on search query
  const filteredServices = services.filter((service) => {
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      service.service_code.toLowerCase().includes(query) ||
      (service.display_name && service.display_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 max-w-[900px] w-full mx-auto px-5 py-12 md:py-16">
        {/* Page Title */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-primary/10 text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            List of Requirements
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Select a civil registry service below to see its exact required documents, fees, processing times, and step-by-step procedures.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for civil registry documents or services..."
            className="w-full h-11 pl-10 pr-4 bg-card border border-border rounded-lg text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-primary/20 shadow-xs"
          />
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-muted-foreground" />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading services...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[14px] p-4 rounded-xl text-center mb-6 font-medium">
            {error}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-10 text-center">
            <p className="text-sm font-semibold mb-1 text-foreground">
              No services found
            </p>
            <p className="text-xs text-muted-foreground">
              Try searching for other keywords like "birth", "marriage", "death", or "CTC".
            </p>
          </div>
        )}

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredServices.map((service) => {
            const isExpanded = !!expandedCodes[service.service_code];
            const groupOrCode = service.requirement_group ?? service.service_code;
            const isConditionalOpen = !!conditionalOpen[service.service_code];
            
            // Filter requirements belonging to this service/group
            const serviceReqs = requirements.filter(
              (r) => r.service_code === groupOrCode || r.requirement_group === groupOrCode
            );
            
            const mandatoryReqs = serviceReqs.filter((r) => r.is_mandatory);
            const conditionalReqs = serviceReqs.filter((r) => !r.is_mandatory);

            // Clean step text
            const cleanedSteps = (service.steps_description ?? [])
              .map(cleanStepText)
              .filter((s) => s.length > 0);

            return (
              <div
                key={service.service_code}
                id={`service-${service.service_code}`}
                className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleExpand(service.service_code)}
                  className={`w-full px-5 py-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isExpanded ? "bg-muted/40 border-b border-border" : "hover:bg-muted/10"
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-sm md:text-base leading-snug block text-foreground">
                      {service.name}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-primary" : "text-muted-foreground"
                    }`}
                  />
                </button>

                {/* Accordion Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-5 space-y-6">
                    {/* ── Key Metrics inline row ───────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
                      <span className="flex items-center gap-1.5">
                        <CircleDollarSign className="size-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {service.fee === 0 || service.fee === null
                            ? "Free of Charge"
                            : `₱${Number(service.fee).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </span>
                      </span>
                      <span aria-hidden className="text-border">·</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{service.processing_time || "Varies / Case by case"}</span>
                      </span>
                    </div>

                    {/* ── Requirements ─────────────────────────────────────── */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Required Documents
                      </h4>

                      {serviceReqs.length === 0 ? (
                        <p className="text-xs italic p-3 rounded-lg border border-dashed text-muted-foreground border-border bg-muted/10">
                          No specific required documents defined in the citizen's charter.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {/* Mandatory requirements */}
                          {mandatoryReqs.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-bold text-muted-foreground">
                                Required Documents ({mandatoryReqs.length})
                              </div>
                              <ul className="space-y-0 divide-y divide-border">
                                {mandatoryReqs.map((req) => {
                                  const { primary, secondary } = parseRequirementName(req.requirement_name);
                                  return (
                                    <li
                                      key={req.id}
                                      className="py-2 list-none"
                                    >
                                      <p className="text-xs font-semibold leading-snug text-foreground">
                                        {primary}
                                      </p>
                                      {secondary && (
                                        <p className="text-[11px] leading-snug mt-0.5 text-muted-foreground">
                                          {secondary}
                                        </p>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Conditional requirements — collapsed */}
                          {conditionalReqs.length > 0 && (
                            <div className="space-y-2">
                              <button
                                onClick={() => toggleConditional(service.service_code)}
                                className="flex items-center justify-between w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border mt-2 cursor-pointer select-none group/trigger"
                              >
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                                  If Applicable ({conditionalReqs.length})
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                    isConditionalOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              <div
                                className={`overflow-hidden transition-all duration-200 ${
                                  isConditionalOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <ul className="space-y-0 divide-y divide-border pt-1">
                                  {conditionalReqs.map((req) => {
                                    const { primary, secondary } = parseRequirementName(req.requirement_name);
                                    return (
                                      <li
                                        key={req.id}
                                        className="py-2 list-none"
                                      >
                                        <p className="text-xs font-medium leading-snug text-foreground">
                                          {primary}
                                        </p>
                                        {secondary && (
                                          <p className="text-[11px] leading-snug mt-0.5 text-muted-foreground">
                                            {secondary}
                                          </p>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Process Steps ────────────────────────────────────── */}
                    {cleanedSteps.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> Step-by-step Procedure
                        </h4>
                        <div className="relative ml-1.5 space-y-0">
                          {cleanedSteps.map((step, idx) => (
                            <div key={idx} className="relative flex gap-3 pb-3 last:pb-0">
                              {/* Timeline connector */}
                              {idx < cleanedSteps.length - 1 && (
                                <div className="absolute left-[9px] top-5 bottom-0 w-[1px] bg-border" />
                              )}
                              <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-foreground leading-relaxed pt-0.5">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── CTA Button ───────────────────────────────────────── */}
                    <div className="pt-4 border-t border-border flex justify-end">
                      <Link
                        to="/service/$serviceCode"
                        params={{ serviceCode: service.service_code }}
                        className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Submit request intent online
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
