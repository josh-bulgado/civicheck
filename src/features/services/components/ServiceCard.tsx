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
 * count and wait above them as supporting text. No shadow and no lift: the
 * border darkening is the whole hover, so a grid of these stays calm.
 */
const ServiceCard = (service: ServiceEntryProps & { canApply?: boolean }) => {
  const { canApply = true, ...serviceProps } = service;
  const entry = useServiceEntry(serviceProps, canApply);

  return (
    <article
      style={service.style}
      className="civic-interactive flex flex-col overflow-hidden rounded-[14px] border border-border bg-white text-card-foreground hover:border-primary/40"
    >
      <div className="flex flex-1 flex-col gap-2 px-4.5 pt-4.5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[15px] leading-[1.35] font-bold text-foreground text-pretty">
            {entry.title}
          </h2>
          <span
            className={`flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-bold whitespace-nowrap ${badgeToneClasses[entry.badge.tone]}`}
          >
            {entry.badge.label}
          </span>
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
          <span>{entry.requirementLabel}</span>
          <span aria-hidden="true">·</span>
          {/* The column header carries the "Released" framing in the directory
              view; here the layout is the only cue, so name it for screen
              readers rather than spending a line of the tile on it. */}
          <span aria-label={`${entry.waitTerm} ${entry.waitLabel}`}>
            {entry.waitLabel}
          </span>
        </p>
      </div>

      {/* Fee and actions share one line on a muted footer band: the amount
          anchors the left, the CTA the right. The band is the only tinted
          surface in the tile, so it reads as the one place to act. The label
          stays small and quiet so the figure carries the eye, and a free
          service switches to the success tone instead of spending another chip
          on it. The body above takes the slack, which pins the band to the
          bottom edge so it lines up across differently-wrapping titles. */}
      <div className="flex items-center justify-between gap-3 border-t border-border-light bg-surface-subtle py-3 pr-3 pl-4.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Fee at cashier
          </p>
          <p
            className={`text-lg leading-tight font-bold tracking-[-0.01em] tabular-nums ${
              entry.isFree ? "text-tone-success" : "text-foreground"
            }`}
          >
            {entry.feeLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant={canApply ? "ghost" : "default"}
            onClick={entry.openRequirements}
            className={
              canApply
                ? "h-10 rounded-full px-3.5 text-[13px] font-semibold hover:bg-white"
                : "h-10 rounded-full px-4.5 text-[13px] font-semibold hover:bg-primary-hover"
            }
          >
            Requirements
          </Button>
          {canApply && (
            <Button
              type="button"
              onClick={entry.startApply}
              className="h-10 rounded-full px-4.5 text-[13px] font-semibold hover:bg-primary-hover"
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      <ServiceEntryDialogs entry={entry} />
    </article>
  );
};

export default ServiceCard;
