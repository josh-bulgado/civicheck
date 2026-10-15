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

// The same wash the dashboard's certificate tiles use, so a document reads as
// the same colour wherever it turns up. Corrections and endorsements share one.
const CATEGORY_TINT: Record<ServiceCategory, { from: string; to: string }> = {
  birth: { from: "#dbe7fa", to: "#bfd3f2" },
  marriage: { from: "#e9e6fa", to: "#d4cff2" },
  death: { from: "#e6ebf4", to: "#cfd8e8" },
  copies: { from: "#dcf0e5", to: "#bfe3cf" },
  corrections: { from: "#dcf0e5", to: "#bfe3cf" },
};

/**
 * The applicant's service card: a category tag, the service's short name, what
 * it costs and how long it takes, and two ways forward. The whole card opens the
 * checklist; "Apply" skips ahead to the confirmation.
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
          backgroundImage: `linear-gradient(155deg, ${tint.from} 0%, ${tint.to} 100%)`,
        }}
        className={cn(
          "group/card relative flex min-h-65.5 cursor-pointer flex-col rounded-[28px] p-5.5 pb-5 text-foreground shadow-[0_1px_2px_rgba(15,27,45,0.05)] max-md:min-h-0 max-md:rounded-[26px] max-md:p-5 max-md:pb-4.5",
          "transition-[transform,box-shadow] duration-180 ease-(--ease-civic)",
          "hover:-translate-y-1.25 hover:shadow-[0_20px_44px_rgba(11,77,162,0.2)]",
          // The two buttons are what take keyboard focus; the card wears the ring.
          "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
      >
        {category && (
          <span className="inline-flex h-7.5 w-fit items-center rounded-full bg-white/70 px-3 text-[13px] font-bold text-portal-ink-2 max-md:h-7">
            {SERVICE_CATEGORY_LABELS[category]}
          </span>
        )}

        <h2
          title={entry.shortTitle === entry.title ? undefined : entry.title}
          className="mt-4 line-clamp-2 text-2xl leading-[1.2] max-md:mt-3.5 font-semibold tracking-[-0.015em] text-pretty text-foreground xl:text-[26px]"
        >
          {entry.shortTitle}
        </h2>

        {/* Takes the slack, so the fee and the actions sit at the foot of every
            card whatever its title does. */}
        <div className="mt-auto pt-6 max-md:pt-3.5">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span
              className={cn(
                "text-[32px] leading-none font-bold tabular-nums max-md:text-[28px]",
                entry.isFree ? "text-tone-success" : "text-foreground",
              )}
            >
              {entry.feeLabel}
            </span>
            <span
              className="text-[15px] leading-snug text-body-strong max-md:text-sm"
              aria-label={`${entry.waitTerm} ${entry.portalWaitLabel}`}
            >
              {entry.portalWaitLabel}
            </span>
          </p>

          <div className="mt-4 flex items-center gap-4 max-md:gap-2.5">
            {/* No handler of its own: its click reaches the card's, so a mouse
                anywhere on the card and Enter on this button do the same thing. */}
            <button
              type="button"
              className="civic-press h-12.5 min-w-0 flex-1 rounded-full bg-white px-3 text-base font-semibold text-primary max-md:h-12 max-md:text-[15px] shadow-[0_4px_12px_rgba(15,27,45,0.1)] transition-colors duration-150 outline-none hover:bg-primary hover:text-white"
            >
              Check requirements
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                entry.startApply();
              }}
              className="civic-press shrink-0 rounded-full px-2 py-3 text-[15px] font-bold text-foreground outline-none hover:text-primary"
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
