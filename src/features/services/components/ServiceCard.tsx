import { Clock, FileText } from "lucide-react";
import {
  badgeToneClasses,
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";
import { Button } from "~/components/ui/button";

/**
 * Two-zone density: the descriptive info (title, badge, meta) sits above a
 * tinted strip carrying the fee and both actions, so "what this costs and
 * what I click" reads as one decision unit instead of two loose rows. Meta
 * icons are pre-attentive scan aids only — the text already carries the
 * full meaning, so the icons stay aria-hidden and the wait term (dropped
 * visually to save width) is restored via aria-label.
 */
const ServiceCard = (service: ServiceEntryProps & { canApply?: boolean }) => {
  const { canApply = true, ...serviceProps } = service;
  const entry = useServiceEntry(serviceProps, canApply);

  return (
    <article
      style={service.style}
      className="civic-interactive civic-lift flex flex-col overflow-hidden rounded-xl border border-border bg-white text-card-foreground shadow-[0_1px_2px_rgba(23,33,43,0.04)] hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_rgba(11,77,162,0.28)]"
    >
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        <div className="flex items-start gap-2 ">
          <h2 className="flex-1 text-[15px] font-bold leading-[1.3] tracking-[-0.01em] text-foreground text-pretty">
            {entry.title}
          </h2>
          <span
            className={`mt-px shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeToneClasses[entry.badge.tone]}`}
          >
            {entry.badge.label}
          </span>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileText
              aria-hidden="true"
              className="size-3.5 text-border-strong"
            />
            {entry.requirementLabel}
          </span>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${entry.waitTerm} ${entry.waitLabel}`}
          >
            <Clock aria-hidden="true" className="size-3.5 text-border-strong" />
            {entry.waitLabel}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-lighter bg-primary-tint px-4 py-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
            Fee at cashier
          </p>
          <p
            className={`text-[16px] font-extrabold tabular-nums ${entry.isFree ? "text-success" : "text-foreground"}`}
          >
            {entry.feeLabel}
          </p>
        </div>
        <div className="flex gap-2">
          {canApply && (
            <Button type="button" size="lg" onClick={entry.startApply}>
              Apply
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={entry.openRequirements}
          >
            Requirements
          </Button>
        </div>
      </div>

      <ServiceEntryDialogs entry={entry} />
    </article>
  );
};

export default ServiceCard;
