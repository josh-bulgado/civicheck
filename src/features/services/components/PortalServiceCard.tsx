import {
  ServiceEntryDialogs,
  useServiceEntry,
  type ServiceEntryProps,
} from "~/features/services/components/useServiceEntry";
import {
  SERVICE_CATEGORY_LABELS,
  getServiceCategory,
  type ServiceCategory,
} from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

// A faint version of the hues the dashboard's certificate tiles use, so a
// document keeps its colour identity without the cards competing with each
// other. `ink` colours the category tag. Corrections and endorsements share one.
const CATEGORY_TINT: Record<
  ServiceCategory,
  { from: string; to: string; ink: string }
> = {
  birth: tint("birth"),
  marriage: tint("marriage"),
  death: tint("death"),
  copies: tint("copies"),
  corrections: tint("copies"),
};

// The washes are CSS variables (see app.css) so the dark theme can swap them.
function tint(category: string) {
  return {
    from: `var(--svc-${category}-from)`,
    to: `var(--svc-${category}-to)`,
    ink: `var(--svc-${category}-ink)`,
  };
}

/**
 * The applicant's service card: a category tag, the service's short name, what
 * it costs and how long it takes, and two ways forward. The whole card opens the
 * checklist, so "Check requirements" is the lead action; "Apply" is the quieter
 * shortcut that skips ahead to the confirmation.
 *
 * No icon: four category icons did not tell seventeen services apart.
 */
export function PortalServiceCard(
  service: ServiceEntryProps & { department_id?: string | null },
) {
  const entry = useServiceEntry(service);
  const category = getServiceCategory(service.department_id);
  const tint = CATEGORY_TINT[category ?? "copies"];

  return (
    <>
      {/* The dialogs sit beside the card, not inside it: React events from a
          portal bubble up the React tree, and a click in a dialog must not
          count as a click on the card behind it. */}
      <article
        onClick={entry.openRequirements}
        style={{
          ...service.style,
          backgroundImage: `linear-gradient(160deg, ${tint.from} 0%, ${tint.to} 100%)`,
        }}
        className={cn(
          "group/card relative flex min-h-59.5 cursor-pointer flex-col rounded-[20px] border border-border-light p-5 text-foreground max-md:min-h-0",
          "transition-[transform,box-shadow] duration-180 ease-(--ease-civic)",
          "hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,27,45,0.09)]",
          // The two buttons are what take keyboard focus; the card wears the ring.
          "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
      >
        {category && (
          <span
            style={{ color: tint.ink }}
            className="inline-flex h-6.5 w-fit items-center rounded-full bg-card/70 px-2.5 text-xs font-semibold"
          >
            {SERVICE_CATEGORY_LABELS[category]}
          </span>
        )}

        <h2
          title={entry.shortTitle === entry.title ? undefined : entry.title}
          className="mt-3.5 line-clamp-2 text-[19px] leading-[1.25] font-semibold tracking-[-0.012em] text-pretty text-foreground"
        >
          {entry.shortTitle}
        </h2>

        {/* Takes the slack, so the fee and the actions sit at the foot of every
            card whatever its title does. */}
        <div className="mt-auto pt-5">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span
              className={cn(
                "text-[22px] leading-[1.15] font-semibold tabular-nums",
                entry.isFree ? "text-tone-success" : "text-foreground",
              )}
            >
              {entry.feeLabel}
            </span>
            <span
              className="text-[13px] leading-snug text-body"
              aria-label={`${entry.waitTerm} ${entry.portalWaitLabel}`}
            >
              {entry.portalWaitLabel}
            </span>
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            {/* No handler of its own: its click reaches the card's, so a mouse
                anywhere on the card and Enter on this button do the same thing. */}
            <button
              type="button"
              className="civic-press h-10 min-w-0 flex-1 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors duration-150 outline-none hover:bg-primary-hover max-md:h-11"
            >
              Check requirements
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                entry.startApply();
              }}
              className="civic-press h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-body-strong transition-colors duration-150 outline-none hover:bg-card/70 hover:text-primary max-md:h-11"
            >
              Apply
            </button>
          </div>
        </div>
      </article>

      <ServiceEntryDialogs entry={entry} variant="portal" />
    </>
  );
}
