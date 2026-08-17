import {
  badgeToneClasses,
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";

/**
 * Compact density: roughly half the height of the old tile. The title leads,
 * the meta reads as one inline line instead of a definition list, and the
 * decorative document icon is gone — at this size it cost a whole row of
 * height and said nothing the title didn't.
 */
const ServiceCard = (service: ServiceEntryProps) => {
  const entry = useServiceEntry(service);

  return (
    <article
      style={service.style}
      className="civic-interactive civic-lift flex flex-col gap-2.5 rounded-xl border border-border bg-white p-4 text-card-foreground shadow-[0_1px_2px_rgba(23,33,43,0.04)] hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_rgba(11,77,162,0.28)]"
    >
      <div className="flex items-start gap-2">
        <h2 className="flex-1 text-[15px] font-bold leading-[1.3] tracking-[-0.01em] text-foreground text-pretty">
          {entry.title}
        </h2>
        <span
          className={`mt-px shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeToneClasses[entry.badge.tone]}`}
        >
          {entry.badge.label}
        </span>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
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

      <dl className="mt-auto flex items-baseline justify-between gap-3 border-t border-border-lighter pt-2.5">
        <dt className="text-[13px] text-muted-foreground">Fee at cashier</dt>
        <dd
          className={`text-[15px] font-bold tabular-nums ${entry.isFree ? "text-success" : "text-foreground"}`}
        >
          {entry.feeLabel}
        </dd>
      </dl>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={entry.startApply}
          className="civic-press inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-[14px] font-bold text-primary-foreground outline-none hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={entry.openRequirements}
          className="civic-press inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-control-border bg-white px-3 text-[14px] font-bold text-body-strong outline-none hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Requirements
        </button>
      </div>

      <ServiceEntryDialogs entry={entry} />
    </article>
  );
};

export default ServiceCard;
