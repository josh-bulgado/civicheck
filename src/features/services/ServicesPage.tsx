import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ChevronDown,
  Clock,
  CircleDollarSign,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  FileText,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { getAllServicesWithRequirements } from "~/features/services/services.queries";
import type { Service, ServiceRequirement } from "~/features/admin/services/services.types";

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
    <div className="min-h-screen bg-ash flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-[900px] w-full mx-auto px-5 py-12 md:py-16">
        {/* Page Title */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-lagoon-light text-lagoon flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="font-display text-[2.25rem] text-basalt mb-3 leading-tight">
            List of Requirements
          </h1>
          <p className="text-[15px] text-slate max-w-[500px] mx-auto leading-relaxed">
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
            className="w-full h-12 pl-11 pr-4 bg-white border border-basalt/12 rounded-xl text-[15px] text-basalt placeholder-slate/60 outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/10 transition-all shadow-xs"
          />
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate/50" />
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-lagoon border-t-transparent" />
            <span className="text-sm text-slate">Loading...</span>
          </div>
        )}

        {error && (
          <div className="bg-ember/8 border border-ember/20 text-ember text-[14px] p-4 rounded-xl text-center mb-6">
            {error}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="bg-white border border-basalt/8 rounded-xl p-10 text-center text-slate">
            <p className="text-[15px] font-semibold text-basalt mb-1">No services found</p>
            <p className="text-sm">Try searching for other keywords like "birth", "marriage", "death", or "CTC".</p>
          </div>
        )}

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredServices.map((service) => {
            const isExpanded = !!expandedCodes[service.service_code];
            const groupOrCode = service.requirement_group ?? service.service_code;
            
            // Filter requirements belonging to this service/group
            const serviceReqs = requirements.filter(
              (r) => r.service_code === groupOrCode || r.requirement_group === groupOrCode
            );
            
            const mandatoryReqs = serviceReqs.filter((r) => r.is_mandatory);
            const conditionalReqs = serviceReqs.filter((r) => !r.is_mandatory);

            return (
              <div
                key={service.service_code}
                id={`service-${service.service_code}`}
                className="bg-white border border-basalt/8 rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleExpand(service.service_code)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left hover:bg-ash/30 transition-colors"
                >
                  <span className="font-semibold text-[15px] md:text-[16px] text-basalt pr-4 leading-snug">
                    {service.name}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-lagoon" : ""
                    }`}
                  />
                </button>

                {/* Accordion Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[1500px] border-t border-basalt/8 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-6 space-y-6">
                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fee */}
                      <div className="bg-ash/50 border border-basalt/5 rounded-xl p-4 flex items-center space-x-3.5">
                        <div className="p-2.5 bg-lagoon-light rounded-lg text-lagoon shrink-0">
                          <CircleDollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate font-semibold uppercase tracking-wider">
                            Standard Fee
                          </p>
                          <p className="text-[15px] font-bold text-basalt">
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
                      <div className="bg-ash/50 border border-basalt/5 rounded-xl p-4 flex items-center space-x-3.5">
                        <div className="p-2.5 bg-lagoon-light rounded-lg text-lagoon shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate font-semibold uppercase tracking-wider">
                            Processing Time
                          </p>
                          <p className="text-[15px] font-bold text-basalt">
                            {service.processing_time || "Varies / Case by case"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements Checklist */}
                    <div className="space-y-4">
                      <h4 className="text-[12px] font-bold text-slate uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-lagoon" /> Required Documents
                      </h4>

                      {serviceReqs.length === 0 ? (
                        <p className="text-[13px] text-slate italic bg-ash/30 p-3 rounded-lg border border-dashed border-basalt/8">
                          No specific required documents defined in the citizen's charter.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Mandatory requirements */}
                          {mandatoryReqs.length > 0 && (
                            <div className="space-y-3">
                              <div className="inline-flex items-center space-x-1.5 text-emerald-800 text-[11px] font-bold bg-emerald-50 px-2.5 py-1 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mandatory Requirements</span>
                              </div>
                              <ul className="space-y-2.5">
                                {mandatoryReqs.map((req) => (
                                  <li
                                    key={req.id}
                                    className="text-[13px] text-slate leading-relaxed border-l-2 border-emerald-500/30 pl-2.5 py-0.5"
                                  >
                                    {req.requirement_name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Conditional requirements */}
                          {conditionalReqs.length > 0 && (
                            <div className="space-y-3">
                              <div className="inline-flex items-center space-x-1.5 text-amber-800 text-[11px] font-bold bg-amber-50 px-2.5 py-1 rounded-md">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Conditional / If Applicable</span>
                              </div>
                              <ul className="space-y-2.5">
                                {conditionalReqs.map((req) => (
                                  <li
                                    key={req.id}
                                    className="text-[13px] text-slate leading-relaxed border-l-2 border-amber-500/30 pl-2.5 py-0.5"
                                  >
                                    {req.requirement_name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Process steps flow */}
                    {service.steps_description && service.steps_description.length > 0 && (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-[12px] font-bold text-slate uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-lagoon" /> Step-by-step Procedure
                        </h4>
                        <div className="relative pl-4 border-l border-basalt/12 ml-2 space-y-5">
                          {service.steps_description.map((step, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[24px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-lagoon text-[9px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <p className="text-[13px] leading-relaxed text-slate">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA button */}
                    <div className="pt-4 border-t border-basalt/8 flex justify-end">
                      <Link
                        to={`/service/${service.service_code}`}
                        className="inline-flex items-center gap-2 bg-lagoon hover:bg-[#0D5E53] text-white font-semibold text-[13px] px-5 py-2.5 rounded-lg transition-colors shadow-sm"
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
