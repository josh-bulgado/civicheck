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
  getServiceRequirements,
  type ServiceRequirement,
} from "~/features/admin/services/services.queries";
import type { Service } from "~/features/admin/services/services.types";
import {
  Clock,
  CircleDollarSign,
  Tag,
  Layers,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  FolderDot,
  FileText,
} from "lucide-react";

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

  if (!service) return null;

  const mandatoryReqs = requirements.filter((r) => r.is_mandatory);
  const conditionalReqs = requirements.filter((r) => !r.is_mandatory);

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
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center space-x-3 hover:shadow-xs transition duration-150">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Standard Fee</p>
                <p className="text-sm font-semibold text-gray-900">
                  {service.fee === 0 || service.fee === null
                    ? "Free / Varies"
                    : `₱${Number(service.fee).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center space-x-3 hover:shadow-xs transition duration-150">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Processing Time</p>
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]" title={service.processing_time}>
                  {service.processing_time || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Group Relationships */}
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

          {/* Steps Description */}
          {service.steps_description && service.steps_description.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" /> Process Steps Flow ({service.steps_description.length})
              </h4>
              <div className="relative pl-4 border-l-2 border-slate-200 ml-2 space-y-4">
                {service.steps_description.map((step, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[25px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 border-2 border-white ring-2 ring-slate-100">
                      {idx + 1}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-600 font-medium">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements Checklist */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" /> Requirements Metadata
            </h4>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                    <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mandatory Requirements ({mandatoryReqs.length})</span>
                    </div>
                    <ul className="space-y-2 pl-1">
                      {mandatoryReqs.map((req) => (
                        <li key={req.id} className="text-xs text-slate-600 leading-relaxed border-l-2 border-emerald-500/30 pl-2 py-0.5">
                          {req.requirement_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conditional List */}
                {conditionalReqs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-semibold bg-amber-50 px-2.5 py-1 rounded-md w-fit">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Conditional / If Applicable ({conditionalReqs.length})</span>
                    </div>
                    <ul className="space-y-2 pl-1">
                      {conditionalReqs.map((req) => (
                        <li key={req.id} className="text-xs text-slate-600 leading-relaxed border-l-2 border-amber-500/30 pl-2 py-0.5">
                          {req.requirement_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 active:bg-slate-950 transition duration-150 shadow-sm"
          >
            Close Panel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
