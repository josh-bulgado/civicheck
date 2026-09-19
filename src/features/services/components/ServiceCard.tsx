import {
  badgeToneClasses,
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";
import { Button } from "~/components/ui/button";

/**
 * Compact density, fee-led. The fee and the actions close the tile on a single
 * line — amount left, buttons right — with the title, status chip, requirements
 * count and wait above them as supporting text. Compared to the older tile this
 * drops the definition-list rows and the divider rules and separates its blocks
 * with whitespace alone, so the eye lands on the price and the CTA together.
 */
const ServiceCard = (service: ServiceEntryProps & { canApply?: boolean }) => {
  const { canApply = true, ...serviceProps } = service;
  const entry = useServiceEntry(serviceProps, canApply);

  return (
    <article
      style={service.style}
      className="civic-interactive civic-lift flex flex-col overflow-hidden rounded-xl border border-border bg-white p-4 text-card-foreground shadow-[0_1px_2px_rgba(23,33,43,0.04)] hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_rgba(11,77,162,0.28)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-foreground text-pretty">
          {entry.title}
        </h2>
        <span
          className={`mt-px shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeToneClasses[entry.badge.tone]}`}
        >
          {entry.badge.label}
        </span>
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground mb-2">
        <span>{entry.requirementLabel}</span>
        <span aria-hidden="true" className="text-border-strong">
          ·
        </span>
        {/* The column header carries the "Released" framing in the directory
            view; here the layout is the only cue, so name it for screen
            readers rather than spending a line of the tile on it. */}
        <span aria-label={`${entry.waitTerm} ${entry.waitLabel}`}>
          {entry.waitLabel}
        </span>
      </p>

      {/* Fee and actions share one line on a muted footer band: the amount
          anchors the left, the CTA the right. The band bleeds to the card
          edges and is the only tinted surface in the tile, so it reads as the
          one place to act. The label stays small and quiet so the figure
          carries the eye, and a free service switches to the success tone
          instead of spending another chip on it. `mt-auto` pins the band to
          the bottom edge so it lines up across differently-wrapping titles. */}
      <div className="-mx-4 -mb-4 mt-auto flex items-center justify-between gap-3 bg-muted px-4 py-3.5 border-t">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Fee at cashier
          </p>
          <p
            className={`mt-0.5 text-lg font-extrabold leading-none tabular-nums tracking-[-0.02em] ${
              entry.isFree ? "text-success" : "text-foreground"
            }`}
          >
            {entry.feeLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canApply && (
            <Button type="button" onClick={entry.startApply}>
              Apply
            </Button>
          )}
          <Button
            type="button"
            variant={canApply ? "ghost" : "default"}
            onClick={entry.openRequirements}
            className={canApply ? "hover:bg-white" : undefined}
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
