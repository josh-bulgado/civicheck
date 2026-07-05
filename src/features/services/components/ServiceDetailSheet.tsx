import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  getServiceRequirements,
  type ServiceRequirement,
} from "~/features/admin/services/services.queries";
import type { Service } from "~/features/admin/services/services.types";
import {
  Clock,
  CircleDollarSign,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  ChevronDown,
  Send,
} from "lucide-react";
import {
  cleanStepText,
  formatFee,
  parseRequirementName,
} from "~/features/services/service-utils";

interface ServiceDetailSheetProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
}: ServiceDetailSheetProps) {
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conditionalOpen, setConditionalOpen] = useState(false);

  useEffect(() => {
    if (!service || !open) return;
    const currentService = service;

    async function loadRequirements() {
      setLoading(true);
      setError(null);
      try {
        const groupOrCode = currentService.requirement_group ?? currentService.service_code;
        const data = await getServiceRequirements({ data: groupOrCode });
        setRequirements(data);
      } catch (err: any) {
        setError(err.message || "Failed to load requirements.");
      } finally {
        setLoading(false);
      }
    }

    loadRequirements();
  }, [service, open]);

  // Reset conditional collapse when switching services
  useEffect(() => {
    setConditionalOpen(false);
  }, [service?.service_code]);

  if (!service) return null;

  const mandatoryReqs = requirements.filter((r) => r.is_mandatory);
  const conditionalReqs = requirements.filter((r) => !r.is_mandatory);
  const cleanedSteps = (service.steps_description ?? [])
    .map(cleanStepText)
    .filter((s) => s.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full h-full flex flex-col p-0 border-l border-border bg-white shadow-2xl overflow-hidden">
        {/* Header Section with gradient background */}
        <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
          <div className="absolute top-0 right-0 p-4">
            {/* Close button handled by SheetContent */}
          </div>
          <div className="space-y-3 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={service.classification === "simple" ? "simple" : "complex"} className="capitalize">
                {service.classification}
              </Badge>
              <code className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-slate-300">
                {service.service_code}
              </code>
            </div>
            <SheetTitle className="text-xl font-bold font-heading text-white leading-tight">
              {service.name}
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Registry and requirements metadata for administrative review.
            </SheetDescription>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* ── Key Metrics Grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fee */}
            <div
              className="rounded-xl p-4 border-l-4 flex items-center space-x-3 transition-shadow hover:shadow-sm"
              style={{
                background: "var(--svc-primary-soft)",
                borderLeftColor: "var(--svc-primary)",
                borderTop: "1px solid var(--svc-primary-border)",
                borderRight: "1px solid var(--svc-primary-border)",
                borderBottom: "1px solid var(--svc-primary-border)",
              }}
            >
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--svc-primary)", color: "#fff" }}
              >
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--svc-text-secondary)" }}>
                  Standard Fee
                </p>
                <p
                  className="text-base font-bold"
                  style={{
                    fontFamily: "var(--svc-font-display)",
                    color: "var(--svc-text-primary)",
                  }}
                >
                  {formatFee(service.fee)}
                </p>
              </div>
            </div>

            {/* Processing Time */}
            <div
              className="rounded-xl p-4 border-l-4 flex items-center space-x-3 transition-shadow hover:shadow-sm"
              style={{
                background: "var(--svc-primary-soft)",
                borderLeftColor: "var(--svc-primary)",
                borderTop: "1px solid var(--svc-primary-border)",
                borderRight: "1px solid var(--svc-primary-border)",
                borderBottom: "1px solid var(--svc-primary-border)",
              }}
            >
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--svc-primary)", color: "#fff" }}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--svc-text-secondary)" }}>
                  Processing Time
                </p>
                <p
                  className="text-sm font-bold truncate max-w-[120px]"
                  title={service.processing_time}
                  style={{
                    fontFamily: "var(--svc-font-display)",
                    color: "var(--svc-text-primary)",
                  }}
                >
                  {service.processing_time || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Group Relationships ──────────────────────────────────── */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> Grouping & Relationships
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-muted-foreground">Display Group:</span>
                <span className="font-medium text-slate-900">{service.display_group || "None (Standalone)"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-muted-foreground">Display Name:</span>
                <span className="font-medium text-slate-900">{service.display_name || "None"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Requirement Group:</span>
                <span className="font-mono text-slate-900 font-medium">{service.requirement_group || service.service_code}</span>
              </div>
            </div>
          </div>

          {/* ── Steps Description ───────────────────────────────────── */}
          {cleanedSteps.length > 0 && (
            <div className="space-y-3">
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-1.5"
                style={{ color: "var(--svc-primary)" }}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Process Steps ({cleanedSteps.length})
              </h4>
              <div className="relative ml-2 space-y-0">
                {cleanedSteps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < cleanedSteps.length - 1 && (
                      <div
                        className="absolute left-[11px] top-6 bottom-0 w-[2px]"
                        style={{ background: "var(--svc-primary-border)" }}
                      />
                    )}
                    <span
                      className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: "var(--svc-primary)", color: "#fff" }}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--svc-text-primary)" }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Requirements Metadata ───────────────────────────────── */}
          <div className="space-y-4">
            <h4
              className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-1.5"
              style={{ color: "var(--svc-primary)" }}
            >
              <FileText className="w-3.5 h-3.5" /> Requirements Metadata
            </h4>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--svc-primary)", borderTopColor: "transparent" }} />
                <span className="text-xs text-muted-foreground">Loading requirements...</span>
              </div>
            ) : error ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
                {error}
              </div>
            ) : requirements.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 text-center rounded-lg">
                <p className="text-xs text-muted-foreground">No specific requirements defined for this service.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mandatory List */}
                {mandatoryReqs.length > 0 && (
                  <div className="space-y-2">
                    <div
                      className="flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1 rounded-md w-fit"
                      style={{
                        background: "var(--svc-primary-soft)",
                        color: "var(--svc-primary)",
                        border: "1px solid var(--svc-primary-border)",
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Required Documents ({mandatoryReqs.length})</span>
                    </div>
                    <ul className="space-y-2 pl-1">
                      {mandatoryReqs.map((req) => {
                        const { primary, secondary } = parseRequirementName(req.requirement_name);
                        return (
                          <li
                            key={req.id}
                            className="border-l-[3px] pl-2.5 py-1"
                            style={{ borderLeftColor: "var(--svc-primary-border)" }}
                          >
                            <p className="text-xs font-semibold leading-snug" style={{ color: "var(--svc-text-primary)" }}>
                              {primary}
                            </p>
                            {secondary && (
                              <p className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--svc-text-secondary)" }}>
                                {secondary}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Conditional List — collapsed */}
                {conditionalReqs.length > 0 && (
                  <Collapsible open={conditionalOpen} onOpenChange={setConditionalOpen}>
                    <CollapsibleTrigger
                      className="flex items-center justify-between w-full gap-2 px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors"
                      style={{
                        background: "var(--svc-caution-soft)",
                        color: "var(--svc-caution)",
                        border: "1px solid var(--svc-caution-border)",
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        If Applicable ({conditionalReqs.length})
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${conditionalOpen ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pl-1 pt-2">
                      {conditionalReqs.map((req) => {
                        const { primary, secondary } = parseRequirementName(req.requirement_name);
                        return (
                          <li
                            key={req.id}
                            className="list-none border-l-[3px] pl-2.5 py-1"
                            style={{ borderLeftColor: "var(--svc-caution-border)" }}
                          >
                            <p className="text-xs font-medium leading-snug" style={{ color: "var(--svc-text-primary)" }}>
                              {primary}
                            </p>
                            {secondary && (
                              <p className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--svc-text-secondary)" }}>
                                {secondary}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-white rounded-lg text-xs font-medium hover:opacity-90 active:opacity-100 transition-opacity shadow-sm"
            style={{ background: "var(--svc-cta)" }}
          >
            Close Panel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
