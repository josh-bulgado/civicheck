import { ArrowRight, Clock, Wallet } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { staggerStyle } from "~/components/motion/stagger";
import {
  ChecklistLoadError,
  ConditionalDocuments,
  OfficeSteps,
  RequiredDocuments,
} from "~/features/services/components/ChecklistSections";
import { FactsStrip } from "~/features/services/components/FactsStrip";
import { useServiceOverview } from "~/features/services/hooks/useServiceOverview";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import {
  cleanStepText,
  formatFee,
  formatServiceCode,
  getVisitBadge,
  summarizeWait,
} from "~/features/services/service-utils";

interface ServiceRequirementsDialogProps {
  /** `display_group ?? service_code` — the same code the apply flow routes on. */
  serviceCode: string;
  title: string;
  fee: number | string;
  displayGroup: string | null;
  processingTime: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Raised by the footer's Apply — the card confirms before routing. Omit
   * for a read-only reference view (e.g. staff looking up requirements) —
   * the Apply button and its helper copy are hidden entirely.
   */
  onApply?: () => void;
}

const badgeToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

export function ServiceRequirementsDialog({
  serviceCode,
  title,
  fee,
  displayGroup,
  processingTime,
  open,
  onOpenChange,
  onApply,
}: ServiceRequirementsDialogProps) {
  const { overview, loading, error, retry } = useServiceOverview(serviceCode, open);

  const visitBadge = getVisitBadge(processingTime);
  const isGroup = overview?.isGroup ?? false;
  const requirements = (overview?.requirements ?? []) as ServiceRequirement[];
  const mandatoryReqs = requirements.filter((req) => req.is_mandatory);
  const conditionalReqs = requirements.filter((req) => !req.is_mandatory);

  // Steps differ per case inside a group, so only a single-case service can
  // show one honest "what happens at the office" list.
  const steps: string[] =
    overview && !isGroup
      ? ((overview.services[0].steps_description ?? []) as string[])
          .map(cleanStepText)
          .filter((step) => step.length > 0)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(46rem,90vh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border-light px-6 pt-6 pb-5 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeToneClasses[visitBadge.tone]}`}
            >
              {visitBadge.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatServiceCode(serviceCode)}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription>
            Everything you need to prepare before filing this request at the
            City Civil Registrar Office.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <FactsStrip
            facts={[
              {
                icon: Wallet,
                label: "Fee at cashier",
                value: formatFee(fee, displayGroup),
                hint: "Paid at the CCRO cashier",
              },
              {
                icon: Clock,
                label: "Time at the office",
                value: summarizeWait(processingTime),
                hint: processingTime,
              },
            ]}
          />

          {loading && (
            <div className="civic-stagger mt-5 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-14 rounded-[10px]"
                  style={staggerStyle(i)}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <ChecklistLoadError
              error={error}
              retry={retry}
              className="civic-enter-scale mt-5"
            />
          )}

          {!loading && !error && overview && (
            <div className="civic-stagger-auto mt-5 flex flex-col gap-5">
              {isGroup && (
                <section className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-foreground">
                    This service covers {overview.services.length} cases
                  </h3>
                  <p className="text-xs text-body">
                    The fee and the steps depend on which one applies to you —
                    you'll pick yours on the first step of the application.
                  </p>
                  <ul className="divide-y divide-border-lighter rounded-[10px] border border-border-light">
                    {overview.services.map((service) => (
                      <li
                        key={service.service_code}
                        className="flex items-baseline justify-between gap-4 px-4 py-3"
                      >
                        <span className="text-sm leading-snug text-body-strong">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-foreground">
                          {formatFee(service.fee)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <RequiredDocuments requirements={mandatoryReqs} />

              <ConditionalDocuments requirements={conditionalReqs} />

              <OfficeSteps steps={steps} />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border-light bg-surface-subtle px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-body">
            {onApply
              ? "You can still submit without every document — staff will flag anything missing."
              : "Reference only — cross-check this against what the visitor has on hand."}
          </p>
          <div className="flex shrink-0 gap-2.5">
            <DialogClose
              render={<Button type="button" variant="outline" size="lg" />}
            >
              Close
            </DialogClose>
            {onApply && (
              <Button
                type="button"
                size="lg"
                onClick={onApply}
              >
                Apply
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
