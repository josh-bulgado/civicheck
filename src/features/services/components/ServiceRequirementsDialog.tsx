import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Clock,
  MapPin,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { staggerStyle } from "~/components/motion/stagger";
import { getServiceOverview } from "~/features/services/services.queries";
import {
  cachedServiceRead,
  invalidateServiceCache,
  peekServiceCache,
  serviceCacheKeys,
} from "~/features/services/services.cache";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import {
  cleanStepText,
  formatFee,
  getVisitBadge,
  parseRequirementName,
  splitCaseLabel,
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
  /** Raised by the footer's Apply — the card confirms before routing. */
  onApply: () => void;
}

type Overview = Awaited<ReturnType<typeof getServiceOverview>>;

const CASE_TAG_LABELS: Record<string, string> = {
  marital_only: "Marital child only",
  non_marital_only: "Non-marital child only",
  brap_only: "Barangay-assisted (BRAP) only",
  foreigner_only: "Foreign parent only",
};

const badgeToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

/** One checklist row — document name, where to secure it, and who it applies to. */
function RequirementRow({
  requirement,
  tone,
}: {
  requirement: ServiceRequirement;
  tone: "required" | "conditional";
}) {
  const { caseLabel, name } = splitCaseLabel(requirement.requirement_name);
  const { primary, secondary } = parseRequirementName(name);
  const source = requirement.where_to_secure ?? secondary;
  const caseTag = requirement.case_tag
    ? (CASE_TAG_LABELS[requirement.case_tag] ?? null)
    : null;

  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-semibold leading-snug text-body-strong">
          {primary}
        </p>
        {(caseLabel || caseTag) && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
            {caseLabel ?? caseTag}
          </span>
        )}
      </div>
      {source && (
        <p
          className={`flex items-start gap-1.5 text-xs leading-snug ${
            tone === "conditional" ? "text-warning-strong" : "text-muted-foreground"
          }`}
        >
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {source}
        </p>
      )}
    </li>
  );
}

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
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [conditionalOpen, setConditionalOpen] = useState(false);

  // Checklists are shared through the service cache, so reopening this popup —
  // or opening another card backed by the same service — costs no query.
  useEffect(() => {
    if (!open) return;
    const cacheKey = serviceCacheKeys.overview(serviceCode);

    const cached = peekServiceCache<Overview>(cacheKey);
    if (cached) {
      setOverview(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await cachedServiceRead(cacheKey, () =>
          getServiceOverview({ data: serviceCode }),
        );
        if (cancelled) return;
        setOverview(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load service overview", err);
        setError("We couldn't load this checklist. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [open, serviceCode, reloadToken]);

  const retry = () => {
    invalidateServiceCache(serviceCacheKeys.overview(serviceCode));
    setReloadToken((token) => token + 1);
  };

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
            <span className="text-xs text-muted-foreground">{serviceCode}</span>
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
          <div className="grid grid-cols-2 divide-x divide-border-light rounded-[10px] border border-border-light">
            <div className="flex flex-col gap-1 px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden="true" />
                Fee at cashier
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatFee(fee, displayGroup)}
              </span>
              <span className="text-xs text-body">Paid at the CCRO cashier</span>
            </div>
            <div className="flex flex-col gap-1 px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                Time at the office
              </span>
              <span className="text-lg font-bold text-foreground">
                {summarizeWait(processingTime)}
              </span>
              <span className="text-xs text-body">{processingTime}</span>
            </div>
          </div>

          {loading && (
            <div className="civic-stagger mt-5 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="civic-skeleton h-14 rounded-[10px]"
                  style={staggerStyle(i)}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="civic-enter-scale mt-5 rounded-[10px] border border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="mb-3 text-sm font-medium text-destructive">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="civic-press inline-flex min-h-9 items-center rounded-lg border border-control-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-surface-subtle"
              >
                Try again
              </button>
            </div>
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

              <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-bold text-foreground">
                  Documents to bring ({mandatoryReqs.length})
                </h3>
                {mandatoryReqs.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-dashed-border bg-background p-3.5 text-xs italic text-muted-foreground">
                    No required documents are listed for this service.
                  </p>
                ) : (
                  <ul className="divide-y divide-border-lighter rounded-[10px] border border-border-light">
                    {mandatoryReqs.map((req) => (
                      <RequirementRow key={req.id} requirement={req} tone="required" />
                    ))}
                  </ul>
                )}
              </section>

              {conditionalReqs.length > 0 && (
                <Collapsible
                  open={conditionalOpen}
                  onOpenChange={setConditionalOpen}
                  className="flex flex-col gap-2.5"
                >
                  <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 text-left select-none">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <AlertTriangle
                        className="size-3.5 text-warning"
                        aria-hidden="true"
                      />
                      Only if it applies to you ({conditionalReqs.length})
                    </h3>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        conditionalOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="divide-y divide-warning-border/40 rounded-[10px] border border-warning-border bg-warning-soft">
                      {conditionalReqs.map((req) => (
                        <RequirementRow
                          key={req.id}
                          requirement={req}
                          tone="conditional"
                        />
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {steps.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-foreground">
                    What happens at the office
                  </h3>
                  <ol className="flex flex-col gap-3">
                    {steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-relaxed text-body-strong">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border-light bg-surface-subtle px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-body">
            You can still submit without every document — staff will flag
            anything missing.
          </p>
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="civic-press inline-flex min-h-10 items-center justify-center rounded-lg border border-border-strong bg-white px-4 text-sm font-bold text-foreground outline-none hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onApply}
              className="civic-press civic-nudge inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground outline-none hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Apply
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
