import { staggerStyle } from "~/components/motion/stagger";
import { Button } from "~/components/ui/button";
import {
  badgeToneClasses,
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";

/**
 * The four-column track the header and every row share, so the meta stays in
 * aligned columns down the whole list. Narrower than that the row collapses to
 * a stacked block — three columns and two buttons don't survive a phone width,
 * and a squeezed table scans worse than the cards do.
 *
 * The switch is a container query, not a viewport one: this list sits inside
 * the dashboard's sidebar inset, so the viewport width overstates the room the
 * row actually has by however wide the sidebar currently is.
 */
const ROW_GRID =
  "@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_8.75rem_5.5rem_13.5rem] @3xl:items-center @3xl:gap-5";

interface ServiceDirectoryProps {
  services: ServiceEntryProps[];
  canApply?: boolean;
}

/**
 * Directory density: one scan line per service. Built for reading the whole
 * catalogue at once — the compact cards are the browsing view, this is the
 * looking-something-up view.
 */
export function ServiceDirectory({ services, canApply = true }: ServiceDirectoryProps) {
  return (
    <div className="@container overflow-hidden rounded-xl border border-border bg-white">
      <div
        className={`${ROW_GRID} hidden border-b border-border-light bg-surface-subtle px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground`}
      >
        <span>Service</span>
        <span>Released</span>
        <span className="text-right">Fee</span>
        <span className="sr-only">Actions</span>
      </div>

      <div className="civic-stagger divide-y divide-border-lighter">
        {services.map((service, index) => (
          <ServiceRow
            key={service.service_code}
            style={staggerStyle(index)}
            canApply={canApply}
            {...service}
          />
        ))}
      </div>
    </div>
  );
}

const ServiceRow = (service: ServiceEntryProps & { canApply?: boolean }) => {
  const { canApply = true, ...serviceProps } = service;
  const entry = useServiceEntry(serviceProps, canApply);

  return (
    <div
      style={service.style}
      className={`${ROW_GRID} flex flex-col gap-3 px-4.5 py-3.5 transition-colors duration-150 hover:bg-surface-subtle`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-foreground">
            {entry.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeToneClasses[entry.badge.tone]}`}
          >
            {entry.badge.label}
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground">
          {entry.requirementLabel}
        </p>
      </div>

      {/* `contents` dissolves this wrapper into the row grid, so released and
          fee land in their own columns at full width while still reading as
          one inline meta line on a phone. */}
      <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] @3xl:contents">
        <span
          aria-label={`${entry.waitTerm} ${entry.waitLabel}`}
          className="text-body-strong"
        >
          {entry.waitLabel}
        </span>
        <span aria-hidden="true" className="text-border-strong @3xl:hidden">
          ·
        </span>
        <span
          aria-label={`Fee ${entry.feeLabel}`}
          className={`font-bold tabular-nums @3xl:text-right @3xl:text-[14px] ${entry.isFree ? "text-success" : "text-foreground"}`}
        >
          {entry.feeLabel}
        </span>
      </div>

      <div className="flex gap-2 @3xl:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={entry.openRequirements}
          className="flex-1 @3xl:flex-none"
        >
          Requirements
        </Button>
        {canApply && (
          <Button
            type="button"
            onClick={entry.startApply}
            className="flex-1 @3xl:flex-none"
          >
            Apply
          </Button>
        )}
      </div>

      <ServiceEntryDialogs entry={entry} />
    </div>
  );
};
