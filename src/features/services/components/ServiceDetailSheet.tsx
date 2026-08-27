import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  getServiceChecklist,
  type ServiceRequirement,
} from "~/features/admin/services/services.queries";
import {
  ClassificationBadge,
  formatFeeRange,
  type ServiceDossier,
} from "~/features/admin/services/components/ServicesColumn";
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
import {
  cachedServiceRead,
  serviceCacheKeys,
} from "~/features/services/services.cache";

interface ServiceDetailSheetProps {
  service: ServiceDossier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (service: ServiceDossier) => void;
  editLabel?: string;
}

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
  onEdit,
  editLabel = "Edit Service",
}: ServiceDetailSheetProps) {
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conditionalOpen, setConditionalOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);

  useEffect(() => {
    if (!service || !open) return;
    const currentService = service;

    async function loadRequirements() {
      setLoading(true);
      setError(null);
      try {
        const data = await cachedServiceRead(
          serviceCacheKeys.checklist(
            currentService.service_code,
            currentService.requirement_group,
          ),
          () =>
            getServiceChecklist({
              data: {
                service_code: currentService.service_code,
                requirement_group: currentService.requirement_group,
              },
            }),
        );
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
    setStepsOpen(true);
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
        {/* Header Section - clean and neutral */}
        <div className="relative p-6 bg-card border-b border-border">
          <div className="space-y-2 pr-8">
            {service.variant_count <= 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <ClassificationBadge classification={service.classification} />
              </div>
            )}
            <SheetTitle className="text-lg font-bold font-heading text-foreground leading-tight">
              {service.name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Service Code: {service.service_code}
            </p>
            <SheetDescription className="text-muted-foreground text-xs">
              Review the requirement checklist and registry details before
              editing this service.
            </SheetDescription>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* ── Key Metrics inline row ───────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
            <span className="flex items-center gap-1.5">
              <CircleDollarSign className="size-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {formatFeeRange(service.minimum_fee, service.maximum_fee)}
              </span>
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {service.processing_time || "N/A"}
              </span>
            </span>
          </div>

          {/* ── Group Relationships ──────────────────────────────────── */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> Grouping & Relationships
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed border-border">
                <span className="text-muted-foreground">Bundled under:</span>
                <span className="font-medium text-foreground uppercase">
                  {service.display_group || "None (Standalone)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border">
                <span className="text-muted-foreground">Public label:</span>
                <span className="font-medium text-foreground">
                  {service.display_name || "None"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  Checklist shared with:
                </span>
                <span className="font-mono text-foreground font-medium uppercase">
                  {service.requirement_group || service.service_code}
                </span>
              </div>
            </div>
          </div>

          {/* ── Internal Variants ───────────────────────────────────── */}
          {service.variant_count > 1 && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" /> Internal Variants (
                {service.variant_count})
              </h4>
              <ul className="divide-y divide-border">
                {service.variants.map((variant) => (
                  <li
                    key={variant.service_code}
                    className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-mono text-xs font-medium text-foreground">
                      {variant.service_code}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {formatFee(variant.fee)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Steps Description ───────────────────────────────────── */}
          {cleanedSteps.length > 0 && (
            <Collapsible
              open={stepsOpen}
              onOpenChange={setStepsOpen}
              className="space-y-3"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer group/trigger select-none">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  How It Works
                </h3>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${stepsOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-1">
                <div className="relative ml-1.5 space-y-0">
                  {cleanedSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="relative flex gap-3 pb-3 last:pb-0"
                    >
                      {/* Timeline connector */}
                      {idx < cleanedSteps.length - 1 && (
                        <div className="absolute left-[9px] top-5 bottom-0 w-[1px] bg-border" />
                      )}
                      {/* Step number */}
                      <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      {/* Step text */}
                      <p className="text-xs text-foreground leading-relaxed pt-0.5">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── Requirements Metadata ───────────────────────────────── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Requirements Metadata
            </h4>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: "var(--primary)",
                    borderTopColor: "transparent",
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  Loading requirements...
                </span>
              </div>
            ) : error ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
                {error}
              </div>
            ) : requirements.length === 0 ? (
              <div className="p-4 border border-dashed border-border text-center rounded-lg">
                <p className="text-xs text-muted-foreground">
                  No specific requirements defined for this service.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mandatory List */}
                {mandatoryReqs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground">
                      Required Documents ({mandatoryReqs.length})
                    </div>
                    <ul className="space-y-0 divide-y divide-border">
                      {mandatoryReqs.map((req) => {
                        const { primary, secondary } = parseRequirementName(
                          req.requirement_name,
                        );
                        const source = req.where_to_secure ?? secondary;
                        return (
                          <li key={req.id} className="py-2.5 list-none">
                            <p className="text-xs font-semibold leading-snug text-foreground">
                              {primary}
                            </p>
                            {source && (
                              <p className="text-[11px] leading-snug mt-0.5 text-muted-foreground">
                                {source}
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
                  <Collapsible
                    open={conditionalOpen}
                    onOpenChange={setConditionalOpen}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border mt-2 cursor-pointer select-none group/trigger">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                        If Applicable ({conditionalReqs.length})
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${conditionalOpen ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="divide-y divide-border pt-1">
                      {conditionalReqs.map((req) => {
                        const { primary, secondary } = parseRequirementName(
                          req.requirement_name,
                        );
                        const source = req.where_to_secure ?? secondary;
                        return (
                          <li key={req.id} className="py-2.5 list-none">
                            <p className="text-xs font-medium leading-snug text-foreground">
                              {primary}
                            </p>
                            {source && (
                              <p className="text-[11px] leading-snug mt-0.5 text-muted-foreground">
                                {source}
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
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(service)}
            >
              {editLabel}
            </Button>
          )}
          <SheetClose render={<Button type="button" size="sm" />}>
            Close Panel
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
