import { staggerStyle } from "~/components/motion/stagger";
import { Button } from "~/components/ui/button";
import {
  badgeToneClasses,
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";

/**
 * The six-column track the header and every row share, so the meta stays in
 * aligned columns down the whole list. Narrower than that the row collapses to
 * a stacked block — five columns and two buttons don't survive a phone width,
 * and a squeezed table scans worse than the cards do.
 *
 * The switch is a container query, not a viewport one: this list sits inside
 * the dashboard's sidebar inset, so the viewport width overstates the room the
 * row actually has by however wide the sidebar currently is.
 *
 * Every track but the first is fixed. Each row is its own grid, so a
 * content-sized track would drift out of line with the header.
 */
const ROW_GRID =
  "@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_8rem_5rem_12rem] @4xl:items-center @4xl:gap-4";

const ACTION = "h-9 flex-1 rounded-full text-[13px] font-semibold @4xl:flex-none";

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
    <div className="@container">
      <div
        className={`${ROW_GRID} hidden border-y border-border-light py-3 text-[13px] font-medium text-muted-foreground`}
      >
        <span>Service</span>
        <span>Visits</span>
        <span>Requirements</span>
        <span>Released</span>
        <span>Fee</span>
        <span className="sr-only">Actions</span>
      </div>

      <div className="civic-stagger border-t border-border-lighter @4xl:border-t-0">
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
  const requirementCount = entry.service.requirement_count;

  return (
    <div
      style={service.style}
      className={`${ROW_GRID} flex flex-col gap-3 border-b border-border-lighter py-3.5 transition-colors duration-150 hover:bg-surface-subtle`}
    >
      {/* `contents` dissolves each wrapper into the row grid, so its children
          land in their own columns at full width while still reading as one
          inline line on a phone. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 @4xl:contents">
        <h3 className="min-w-0 text-sm leading-snug font-semibold text-foreground">
          {entry.title}
        </h3>
        <span
          className={`flex h-6 shrink-0 items-center justify-self-start rounded-full px-2.5 text-[11px] font-bold whitespace-nowrap ${badgeToneClasses[entry.badge.tone]}`}
        >
          {entry.badge.label}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted-foreground @4xl:contents @4xl:text-sm">
        {/* The column header says "Requirements"; stacked, the count needs its
            own noun. */}
        <span>
          {requirementCount}
          <span className="@4xl:sr-only">
            {requirementCount === 1 ? " requirement" : " requirements"}
          </span>
        </span>
        <span aria-hidden="true" className="@4xl:hidden">
          ·
        </span>
        <span aria-label={`${entry.waitTerm} ${entry.waitLabel}`}>
          {entry.waitLabel}
        </span>
        <span aria-hidden="true" className="@4xl:hidden">
          ·
        </span>
        <span
          aria-label={`Fee ${entry.feeLabel}`}
          className={`font-bold tabular-nums ${entry.isFree ? "text-tone-success" : "text-foreground"}`}
        >
          {entry.feeLabel}
        </span>
      </div>

      <div className="flex gap-1.5 @4xl:justify-end">
        <Button
          type="button"
          variant={canApply ? "ghost" : "default"}
          onClick={entry.openRequirements}
          className={
            canApply
              ? `${ACTION} bg-muted px-3 @4xl:bg-transparent`
              : `${ACTION} px-4 hover:bg-primary-hover`
          }
        >
          Requirements
        </Button>
        {canApply && (
          <Button
            type="button"
            onClick={entry.startApply}
            className={`${ACTION} px-4 hover:bg-primary-hover`}
          >
            Apply
          </Button>
        )}
      </div>

      <ServiceEntryDialogs entry={entry} />
    </div>
  );
};
