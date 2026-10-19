import { QuietLink } from "~/components/quiet-link";
import { cn } from "~/lib/utils";
import { bannerStyle } from "../banners";
import {
  heroActionLabel,
  heroHeadline,
  heroLead,
  heroServiceLabel,
  leadCaptions,
  trackerDetails,
} from "../hero";
import type { CitizenDashboardRequest } from "../types";
import { LeadTracker } from "./LeadTracker";

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
  // Submitted and processing: the card says where the request stands outright
  // and names the document under it, rather than describing the document's
  // state.
  const lead = heroLead(request.status, limitLabel(label));
  const trackerClassName = cn(
    "mt-5.5",
    compact
      ? "md:mt-[clamp(0.875rem,2.6vh,2rem)]"
      : "md:mt-[clamp(1rem,3.6vh,2.75rem)]",
  );

  return (
    <section
      aria-labelledby="hero-headline"
      style={bannerStyle(request.status)}
      // On desktop the card is as tall as what is in it (headline, button,
      // tracker, which scale with the window's height) plus its padding. It
      // does not stretch to the bottom of the screen: that left the content
      // floating in empty blue.
      className={cn(
        "portal-banner font-geist flex flex-col rounded-[28px] p-5.5 md:rounded-hero md:px-12",
        compact
          ? "md:py-[clamp(1.5rem,3.4vh,2.5rem)]"
          : "md:py-[clamp(1.75rem,4vh,3rem)]",
      )}
    >
      {/* Bold at its natural letter spacing, the same as the "What do you need
          today?" card. Bold runs wider, so the sizes sit about 15% under the
          light ones they replaced: a long service name still wraps to two lines
          and the dashboard stays on one screen.
          Size first, line-height after: tailwind-merge drops a `leading-*`
          that comes before a `text-[…]` size. */}
      <h2
        id="hero-headline"
        className={cn(
          long
            ? "text-[26px] md:text-[clamp(1.875rem,4.8vh,2.875rem)]"
            : "text-[28px] md:text-[clamp(2.125rem,5.4vh,3.25rem)]",
          "min-w-0 leading-[1.15] font-bold tracking-normal text-foreground md:max-w-[min(var(--banner-text),68.75rem)]",
        )}
      >
        {lead ? (
          lead.headline
        ) : (
          <>
            {/* One run of text, so "is ready" follows the name on its last line
                when there is room, instead of dropping under a name that
                already wrapped. The state is nowrap, so when there is no room
                it moves down as a unit and never splits. A registry name with
                no short name can run to a sentence, so it is cut short rather
                than pushing the state off the end. */}
            Your {limitLabel(label)}{" "}
            <span className="whitespace-nowrap">
              {verb} <em className="text-primary not-italic">{emphasis}</em>
            </span>
          </>
        )}
      </h2>

      {lead ? (
        <p className="mt-2 text-base leading-[1.35] text-body-2 md:mt-[clamp(0.375rem,1vh,0.75rem)] md:max-w-[min(var(--banner-text),68.75rem)] md:text-[clamp(1.0625rem,2.4vh,1.5rem)]">
          {lead.line}
        </p>
      ) : null}

      {/* Under the sentence it answers, at its left edge. On a phone the
          tracker and its note come first and this closes the card. */}
      <QuietLink
        to="/my-requests/$requestId"
        params={{ requestId: request.id }}
        className="civic-press mt-4.5 inline-flex h-13.5 shrink-0 items-center justify-center self-start rounded-full bg-primary-fill px-7 text-[17px] font-semibold whitespace-nowrap text-white shadow-portal-button hover:bg-primary-fill-hover max-md:order-last max-md:w-full md:mt-[clamp(0.75rem,2.2vh,1.5rem)] md:h-[clamp(2.75rem,5vh,3.5rem)]"
      >
        {heroActionLabel(request.status)}
      </QuietLink>

      {/* The tracker ends 70% of the way across the card, short of the art at
          the right edge. The art is sized by the card's width, so its parts
          stay at the same share of it: this is "70% of the card" written
          against the tracker's own width (the card less its 3rem of padding
          each side). */}
      <LeadTracker
        status={request.status}
        captions={leadCaptions(request, details)}
        tag={details.tag}
        className={cn(trackerClassName, "md:max-w-[calc(70%+1.2rem)]")}
      />
      {/* The columns are too narrow for the note on a phone. A submitted or
          processing request has said all this under its headline. */}
      {details.note && !lead ? (
        <p className="mt-4.5 text-[15px] leading-[1.4] font-semibold text-portal-ink-2 md:hidden">
          {details.note}
        </p>
      ) : null}
    </section>
  );
}
