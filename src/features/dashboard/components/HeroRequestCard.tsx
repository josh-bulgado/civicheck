import { QuietLink } from "~/components/quiet-link";
import { cn } from "~/lib/utils";
import {
  heroActionLabel,
  heroHeadline,
  heroServiceLabel,
  trackerDetails,
} from "../hero";
import type { CitizenDashboardRequest } from "../types";
import { StageTracker } from "./StageTracker";

interface HeroRequestCardProps {
  request: CitizenDashboardRequest;
  /** Other requests sit below the card, so it gives up a little more height. */
  compact?: boolean;
}

/** About two lines of headline; past this the name is cut at a word. */
const MAX_LABEL_LENGTH = 80;

function limitLabel(label: string): string {
  if (label.length <= MAX_LABEL_LENGTH) return label;
  const cut = label.slice(0, MAX_LABEL_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * The dashboard's one live status card: the headline names where the main
 * request stands, the button under it is what to do about it, and the tracker
 * carries the detail.
 */
export function HeroRequestCard({ request, compact = false }: HeroRequestCardProps) {
  const label = heroServiceLabel(request);
  const { verb, emphasis } = heroHeadline(request.status);
  const details = trackerDetails(request);
  // "needs one more document" is the longest ending, so it takes the smaller
  // size to stay on as few lines as it can.
  const long = request.status === "incomplete";

  return (
    <section
      aria-labelledby="hero-headline"
      // On desktop the card is what the page does not need for anything else:
      // it grows to the bottom of the screen, and what is in it (headline,
      // button, tracker) scales up with the height and sits in the middle.
      className={cn(
        "flex flex-col rounded-[28px] bg-(image:--portal-hero) p-5.5 md:flex-1 md:justify-center md:rounded-hero md:px-12",
        compact
          ? "md:py-[clamp(1.25rem,2.6vh,2.25rem)]"
          : "md:py-[clamp(1.5rem,3.4vh,3rem)]",
      )}
    >
      {/* Size first, line-height after: tailwind-merge drops a `leading-*`
          that comes before a `text-[…]` size. */}
      <h2
        id="hero-headline"
        className={cn(
          long
            ? "text-[28px] md:text-[clamp(2.25rem,5.6vh,3.375rem)]"
            : "text-[30px] md:text-[clamp(2.5rem,6.4vh,3.75rem)]",
          "min-w-0 leading-[1.08] font-normal tracking-[-0.03em] text-foreground md:max-w-275",
        )}
      >
        {/* One run of text, so "is ready" follows the name on its last line
            when there is room, instead of dropping under a name that already
            wrapped. The state is nowrap, so when there is no room it moves
            down as a unit and never splits. A registry name with no short name
            can run to a sentence, so it is cut short rather than pushing the
            state off the end. */}
        Your {limitLabel(label)}{" "}
        <span className="whitespace-nowrap">
          {verb} <em className="font-medium">{emphasis}</em>
        </span>
      </h2>

      {/* Under the sentence it answers, at its left edge. On a phone the
          tracker and its note come first and this closes the card. */}
      <QuietLink
        to="/my-requests/$requestId"
        params={{ requestId: request.id }}
        className="civic-press mt-4.5 inline-flex h-13.5 shrink-0 items-center justify-center self-start rounded-full bg-primary-fill px-7 text-[17px] font-semibold whitespace-nowrap text-white shadow-portal-button hover:bg-primary-fill-hover max-md:order-last max-md:w-full md:mt-[clamp(0.75rem,2.2vh,1.5rem)] md:h-[clamp(2.75rem,5vh,3.5rem)]"
      >
        {heroActionLabel(request.status)}
      </QuietLink>

      <StageTracker
        status={request.status}
        details={details}
        fluid
        className={cn(
          "mt-5.5",
          compact
            ? "md:mt-[clamp(0.875rem,2.6vh,2rem)]"
            : "md:mt-[clamp(1rem,3.6vh,2.75rem)]",
        )}
      />
      {/* The columns are too narrow for the note on a phone. */}
      {details.note ? (
        <p className="mt-4.5 text-[15px] leading-[1.4] font-semibold text-portal-ink-2 md:hidden">
          {details.note}
        </p>
      ) : null}
    </section>
  );
}
