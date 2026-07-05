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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--svc-surface)" }}>
      <SiteHeader />

      <main className="flex-1 max-w-[900px] w-full mx-auto px-5 py-12 md:py-16">
        {/* Page Title */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm"
            style={{ background: "var(--svc-primary)", color: "#fff" }}
          >
            <ClipboardList className="w-7 h-7" />
          </div>
          <h1
            className="text-[2.25rem] font-bold mb-3 leading-tight"
            style={{
              fontFamily: "var(--svc-font-display)",
              color: "var(--svc-text-primary)",
            }}
          >
            List of Requirements
          </h1>
          <p
            className="text-[15px] max-w-[520px] mx-auto leading-relaxed"
            style={{ color: "var(--svc-text-secondary)" }}
          >
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
            className="w-full h-12 pl-11 pr-4 bg-white border rounded-xl text-[15px] outline-none transition-all shadow-sm"
            style={{
              borderColor: "#D1D5DB",
              color: "var(--svc-text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--svc-primary)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--svc-primary-soft)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#D1D5DB";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
            }}
          />
          <Search className="absolute left-4 top-3.5 w-5 h-5" style={{ color: "var(--svc-text-muted)" }} />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"
              style={{ borderColor: "var(--svc-primary)", borderTopColor: "transparent" }}
            />
            <span className="text-sm" style={{ color: "var(--svc-text-secondary)" }}>Loading services...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[14px] p-4 rounded-xl text-center mb-6 font-medium">
            {error}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--svc-text-primary)" }}>
              No services found
            </p>
            <p className="text-sm" style={{ color: "var(--svc-text-secondary)" }}>
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
                className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow duration-200 hover:shadow-sm"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleExpand(service.service_code)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors"
                  style={{
                    background: isExpanded ? "var(--svc-primary-soft)" : "white",
                  }}
                >
                  <div className="flex-1 pr-4">
                    <span
                      className="font-bold text-[15px] md:text-[16px] leading-snug block"
                      style={{ color: "var(--svc-text-primary)" }}
                    >
                      {service.name}
                    </span>

                  </div>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    style={{ color: isExpanded ? "var(--svc-primary)" : "var(--svc-text-muted)" }}
                  />
                </button>

                {/* Accordion Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[2000px] border-t border-gray-200 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-6 space-y-6">
                    {/* ── Key Metrics ──────────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fee */}
                      <div
                        className="rounded-xl p-4 border-l-4 flex items-center space-x-3.5 transition-shadow hover:shadow-sm"
                        style={{
                          background: "var(--svc-primary-soft)",
                          borderLeftColor: "var(--svc-primary)",
                          borderTop: "1px solid var(--svc-primary-border)",
                          borderRight: "1px solid var(--svc-primary-border)",
                          borderBottom: "1px solid var(--svc-primary-border)",
                        }}
                      >
                        <div
                          className="p-2.5 rounded-lg shrink-0"
                          style={{ background: "var(--svc-primary)", color: "#fff" }}
                        >
                          <CircleDollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--svc-text-secondary)" }}
                          >
                            Standard Fee
                          </p>
                          <p
                            className="text-lg font-bold"
                            style={{
                              fontFamily: "var(--svc-font-display)",
                              color: "var(--svc-text-primary)",
                            }}
                          >
                            {service.fee === 0 || service.fee === null
                              ? "Free of Charge"
                              : `₱${Number(service.fee).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`}
                          </p>
                        </div>
                      </div>

                      {/* Processing Time */}
                      <div
                        className="rounded-xl p-4 border-l-4 flex items-center space-x-3.5 transition-shadow hover:shadow-sm"
                        style={{
                          background: "var(--svc-primary-soft)",
                          borderLeftColor: "var(--svc-primary)",
                          borderTop: "1px solid var(--svc-primary-border)",
                          borderRight: "1px solid var(--svc-primary-border)",
                          borderBottom: "1px solid var(--svc-primary-border)",
                        }}
                      >
                        <div
                          className="p-2.5 rounded-lg shrink-0"
                          style={{ background: "var(--svc-primary)", color: "#fff" }}
                        >
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--svc-text-secondary)" }}
                          >
                            Processing Time
                          </p>
                          <p
                            className="text-lg font-bold"
                            style={{
                              fontFamily: "var(--svc-font-display)",
                              color: "var(--svc-text-primary)",
                            }}
                          >
                            {service.processing_time || "Varies / Case by case"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Requirements ─────────────────────────────────────── */}
                    <div className="space-y-4">
                      <h4
                        className="text-[12px] font-bold uppercase tracking-[0.08em] flex items-center gap-2"
                        style={{ color: "var(--svc-primary)" }}
                      >
                        <FileText className="w-4 h-4" /> Required Documents
                      </h4>

                      {serviceReqs.length === 0 ? (
                        <p
                          className="text-[13px] italic p-4 rounded-lg border border-dashed"
                          style={{
                            color: "var(--svc-text-secondary)",
                            borderColor: "#D1D5DB",
                            background: "var(--svc-surface)",
                          }}
                        >
                          No specific required documents defined in the citizen's charter.
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {/* Mandatory requirements */}
                          {mandatoryReqs.length > 0 && (
                            <div className="space-y-3">
                              <div
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-md"
                                style={{
                                  background: "var(--svc-primary-soft)",
                                  color: "var(--svc-primary)",
                                  border: "1px solid var(--svc-primary-border)",
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Required Documents ({mandatoryReqs.length})
                              </div>
                              <ul className="space-y-2">
                                {mandatoryReqs.map((req) => {
                                  const { primary, secondary } = parseRequirementName(req.requirement_name);
                                  return (
                                    <li
                                      key={req.id}
                                      className="border-l-[3px] pl-3 py-1.5"
                                      style={{ borderLeftColor: "var(--svc-primary-border)" }}
                                    >
                                      <p
                                        className="text-[13px] font-semibold leading-snug"
                                        style={{ color: "var(--svc-text-primary)" }}
                                      >
                                        {primary}
                                      </p>
                                      {secondary && (
                                        <p
                                          className="text-[11px] leading-snug mt-0.5"
                                          style={{ color: "var(--svc-text-secondary)" }}
                                        >
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
                                className="flex items-center justify-between w-full gap-2 px-3 py-2 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                                style={{
                                  background: "var(--svc-caution-soft)",
                                  color: "var(--svc-caution)",
                                  border: "1px solid var(--svc-caution-border)",
                                }}
                              >
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  If Applicable ({conditionalReqs.length})
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${
                                    isConditionalOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {!isConditionalOpen && (
                                <p className="text-[11px] pl-1" style={{ color: "var(--svc-text-muted)" }}>
                                  These may apply depending on your specific case. Tap to expand.
                                </p>
                              )}

                              <div
                                className={`overflow-hidden transition-all duration-200 ${
                                  isConditionalOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <ul className="space-y-2 pt-1">
                                  {conditionalReqs.map((req) => {
                                    const { primary, secondary } = parseRequirementName(req.requirement_name);
                                    return (
                                      <li
                                        key={req.id}
                                        className="border-l-[3px] pl-3 py-1.5"
                                        style={{ borderLeftColor: "var(--svc-caution-border)" }}
                                      >
                                        <p
                                          className="text-[13px] font-medium leading-snug"
                                          style={{ color: "var(--svc-text-primary)" }}
                                        >
                                          {primary}
                                        </p>
                                        {secondary && (
                                          <p
                                            className="text-[11px] leading-snug mt-0.5"
                                            style={{ color: "var(--svc-text-secondary)" }}
                                          >
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
                      <div className="space-y-4 pt-2">
                        <h4
                          className="text-[12px] font-bold uppercase tracking-[0.08em] flex items-center gap-2"
                          style={{ color: "var(--svc-primary)" }}
                        >
                          <ArrowRight className="w-4 h-4" /> Step-by-step Procedure
                        </h4>
                        <div className="relative ml-2 space-y-0">
                          {cleanedSteps.map((step, idx) => (
                            <div key={idx} className="relative flex gap-4 pb-5 last:pb-0">
                              {/* Timeline connector */}
                              {idx < cleanedSteps.length - 1 && (
                                <div
                                  className="absolute left-[13px] top-7 bottom-0 w-[2px]"
                                  style={{ background: "var(--svc-primary-border)" }}
                                />
                              )}
                              <span
                                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                                style={{ background: "var(--svc-primary)", color: "#fff" }}
                              >
                                {idx + 1}
                              </span>
                              <p
                                className="text-[13px] leading-relaxed font-medium pt-0.5"
                                style={{ color: "var(--svc-text-primary)" }}
                              >
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── CTA Button ───────────────────────────────────────── */}
                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                      <Link
                        to="/service/$serviceCode"
                        params={{ serviceCode: service.service_code }}
                        className="inline-flex items-center gap-2 text-white font-semibold text-[13px] px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 shadow-sm"
                        style={{ background: "var(--svc-cta)" }}
                      >
                        Submit request intent online
                        <ArrowRight className="w-4 h-4" />
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
