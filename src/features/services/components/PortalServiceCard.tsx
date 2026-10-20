import type { CSSProperties } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
// other. The dark pairs are the tiles' own. `ink` and `inkDark` colour the
// category tag. Corrections and endorsements share one.
type Tint = {
  from: string;
  to: string;
  fromDark: string;
  toDark: string;
  ink: string;
  inkDark: string;
};

const CATEGORY_TINT: Record<ServiceCategory, Tint> = {
  birth: {
    from: "#ecf2fb",
    to: "#f6f9fd",
    fromDark: "#1c2b45",
    toDark: "#172338",
    ink: "#2f5fb3",
    inkDark: "#8db3ee",
  },
  marriage: {
    from: "#f0eefa",
    to: "#f8f7fd",
    fromDark: "#261f3d",
    toDark: "#1f1a33",
    ink: "#6a53b8",
    inkDark: "#b3a3ee",
  },
  death: {
    from: "#edf0f5",
    to: "#f7f8fa",
    fromDark: "#23272e",
    toDark: "#1c2026",
    ink: "#566680",
    inkDark: "#a9b6c9",
  },
  copies: {
    from: "#ebf5ef",
    to: "#f6faf8",
    fromDark: "#14291f",
    toDark: "#10221a",
    ink: "#2f7d52",
    inkDark: "#84c9a2",
  },
  corrections: {
    from: "#ebf5ef",
    to: "#f6faf8",
    fromDark: "#14291f",
    toDark: "#10221a",
    ink: "#2f7d52",
    inkDark: "#84c9a2",
  },
};

// The card's two pills: full-round, 44px on touch, and no focus ring of their
// own (the card shows one for both).
const BUTTON_PILL =
  "civic-press rounded-full px-3 font-semibold max-md:h-11 focus-visible:border-transparent focus-visible:ring-0";

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
      <Card
        variant="quiet"
        onClick={entry.openRequirements}
        style={
          {
            ...service.style,
            "--tile-from": tint.from,
            "--tile-to": tint.to,
            "--tile-from-dark": tint.fromDark,
            "--tile-to-dark": tint.toDark,
            "--tile-ink": tint.ink,
            "--tile-ink-dark": tint.inkDark,
          } as CSSProperties
        }
        className={cn(
          "tile-wash relative min-h-59.5 cursor-pointer gap-0 text-foreground [--card-spacing:--spacing(5)] max-md:min-h-0",
          "transition-[transform,box-shadow] duration-180 ease-(--ease-civic)",
          "hover:-translate-y-0.5 data-[variant=quiet]:hover:shadow-portal-hairline-hover",
          // The two buttons are what take keyboard focus; the card wears the ring.
          "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        )}
      >
        <CardHeader className="gap-3.5">
          {category && (
            <Badge
              variant="secondary"
              className="h-6.5 bg-card/70 px-2.5 font-semibold text-(--tile-ink) dark:text-(--tile-ink-dark)"
            >
              {SERVICE_CATEGORY_LABELS[category]}
            </Badge>
          )}
          {/* CardTitle is a div, so the heading role carries the h2 it replaces. */}
          <CardTitle
            role="heading"
            aria-level={2}
            title={entry.shortTitle === entry.title ? undefined : entry.title}
            className="text-[19px] leading-[1.25] font-semibold tracking-[-0.012em] text-pretty text-foreground"
          >
            {entry.shortTitle}
          </CardTitle>
        </CardHeader>

        {/* Takes the slack, so the fee and the actions sit at the foot of every
            card whatever its title does. */}
        <CardContent className="mt-auto pt-5">
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
        </CardContent>

        <CardFooter className="mt-3.5 gap-2">
          {/* No handler of its own: its click reaches the card's, so a mouse
              anywhere on the card and Enter on this button do the same thing.
              Both drop the button's own focus ring for the card's. */}
          <Button
            size="lg"
            className={cn(
              BUTTON_PILL,
              "min-w-0 flex-1 hover:bg-primary-fill-hover",
            )}
          >
            Check requirements
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={(event) => {
              event.stopPropagation();
              entry.startApply();
            }}
            className={cn(
              BUTTON_PILL,
              "shrink-0 text-body-strong hover:bg-card/70 hover:text-primary",
            )}
          >
            Apply
          </Button>
        </CardFooter>
      </Card>

      <ServiceEntryDialogs entry={entry} variant="portal" />
    </>
  );
}
