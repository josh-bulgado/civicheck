import { Skeleton } from "~/components/ui/skeleton";
import { peekCurrentUser } from "~/features/auth/current-user";
import { cn } from "~/lib/utils";
import {
  EMPTY_SHAPE,
  readDashboardShape,
  type DashboardShape,
} from "./dashboard-shape";

// Each part below is the silhouette of one real component, written with that
// component's own sizes and spacing (HeroRequestCard, LeadTracker,
// AttentionPanel, CertificateTiles, ...), so the page replaces it in place and
// nothing under it moves. Change one and the other together.

/** A mark inside a larger placeholder, a shade darker than the block it sits on. */
function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-md bg-foreground/8", className)}
    />
  );
}

/** The four document tiles: bounded artwork panels, or the slim row under a request. */
function TilesSkeleton({ strip = false }: { strip?: boolean }) {
  return (
    <div
      data-part={strip ? "tile-strip" : "tiles"}
      aria-hidden="true"
      className={cn(
        // A phone scrolls them sideways, with the next one peeking in.
        "max-md:-mx-5 max-md:flex max-md:gap-3 max-md:overflow-hidden max-md:px-5 md:grid md:grid-cols-2",
        strip
          ? "auto-rows-[5rem] gap-3 md:auto-rows-[6rem] md:grid-cols-4 md:gap-4"
          : "shrink-0 gap-4 md:gap-5 xl:grid-cols-4",
      )}
    >
      {[0, 1, 2, 3].map((tile) => (
        <Skeleton
          key={tile}
          className={cn(
            "max-md:h-47.5 max-md:w-39.5 max-md:shrink-0 max-md:rounded-4xl",
            strip ? "rounded-4xl" : "rounded-[28px]",
          )}
        >
          {strip ? null : (
            <>
              <span className="hidden aspect-[6/5] max-h-72 w-full md:block" />
              <span className="hidden h-32 md:block" />
            </>
          )}
        </Skeleton>
      ))}
    </div>
  );
}

/** "What do you need today?": the blue card, then the four tiles. */
function PromptSkeleton() {
  return (
    <>
      <Skeleton
        data-part="prompt"
        // Not `rounded-hero`: class merging does not know that name, so the
        // Skeleton's own radius would win and square the corners off.
        className="flex flex-col items-start gap-6 rounded-[var(--radius-hero)] px-5 py-7 md:flex-row md:items-center md:gap-8 md:px-10 md:py-9"
      >
        <div className="w-full min-w-0 flex-1">
          <Mark className="h-8 w-4/5 md:h-12 md:w-96 md:max-w-full" />
          <Mark className="mt-3.5 h-5 w-3/5 md:h-5.5 md:w-80 md:max-w-full" />
          <Mark className="mt-4 h-10 w-32" />
        </div>
        <Mark className="h-13.5 w-full shrink-0 rounded-full md:h-13 md:w-52" />
      </Skeleton>
      <TilesSkeleton />
    </>
  );
}

/**
 * The four stages, the ones already finished a shade darker, as the tracker
 * draws them. From tablet up the first `captioned` stages have a line under
 * their label, and the stage the request is in a pill when `tag` is set.
 */
function TrackerSkeleton({
  done,
  captioned,
  tag,
  className,
}: {
  done: number;
  captioned: number;
  tag: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex", className)}>
      {[1, 2, 3, 4].map((stage) => {
        const finished = stage <= done;
        const hasCaption = stage <= captioned;
        const hasTag = tag && stage === done + 1;
        return (
          <div
            key={stage}
            className={cn("min-w-0", stage < 4 ? "flex-1 pr-2 md:pr-3" : "shrink-0")}
          >
            <div className="flex items-center">
              <Mark
                className={cn(
                  "size-7 shrink-0 rounded-full md:size-[clamp(2rem,4.6vh,3.25rem)]",
                  finished && "bg-foreground/20",
                )}
              />
              {stage < 4 && (
                <Mark
                  className={cn(
                    "mx-1.5 h-0.75 flex-1 md:mx-[clamp(0.75rem,1.6vh,1.5rem)] md:h-[clamp(3px,0.5vh,6px)]",
                    finished && "bg-foreground/20",
                  )}
                />
              )}
            </div>
            <Mark className="mt-2.5 h-3.5 w-14 md:mt-[clamp(0.625rem,1.8vh,1.25rem)] md:h-[clamp(1rem,2.4vh,1.375rem)] md:w-24" />
            {hasCaption || hasTag ? (
              // Release is only as wide as its label: what hangs under it takes
              // no width, as in the tracker.
              <div className={cn("hidden md:block", stage === 4 && "w-0")}>
                {hasCaption ? (
                  <Mark
                    className={cn(
                      "mt-0.5 md:h-[clamp(1rem,2.4vh,1.4rem)]",
                      stage === 4 ? "w-40" : "w-5/6",
                    )}
                  />
                ) : null}
                {hasTag ? (
                  <Mark className="w-28 rounded-full md:mt-[clamp(0.375rem,1vh,0.625rem)] md:h-[clamp(1.5rem,3.2vh,2rem)]" />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The request needing the applicant most. A submitted or processing one carries
 * a line under its headline; the tracker shows how far along it is.
 */
function HeroSkeleton({
  lead,
  done,
  captioned,
  tag,
  compact,
}: {
  lead: boolean;
  done: number;
  captioned: number;
  tag: boolean;
  compact: boolean;
}) {
  return (
    <Skeleton
      data-part="hero"
      className={cn(
        "flex flex-col rounded-[28px] p-5.5 md:rounded-hero md:px-12",
        compact
          ? "md:py-[clamp(1.5rem,3.4vh,2.5rem)]"
          : "md:py-[clamp(1.75rem,4vh,3rem)]",
      )}
    >
      <Mark className="h-8 w-4/5 md:h-[clamp(2.125rem,5.4vh,3.25rem)] md:w-3/5" />
      {lead ? (
        <Mark className="mt-2 h-5 w-3/5 md:mt-[clamp(0.375rem,1vh,0.75rem)] md:h-[clamp(1.0625rem,2.4vh,1.5rem)] md:w-2/5" />
      ) : null}
      {/* On a phone the button closes the card, under the tracker. */}
      <Mark className="mt-4.5 h-13.5 w-40 rounded-full max-md:order-last max-md:w-full md:mt-[clamp(0.75rem,2.2vh,1.5rem)] md:h-[clamp(2.75rem,5vh,3.5rem)]" />
      <TrackerSkeleton
        done={done}
        captioned={captioned}
        tag={tag}
        className={cn(
          "mt-5.5 md:max-w-[calc(70%+1.2rem)]",
          compact
            ? "md:mt-[clamp(0.875rem,2.6vh,2rem)]"
            : "md:mt-[clamp(1rem,3.6vh,2.75rem)]",
        )}
      />
    </Skeleton>
  );
}

/** "Needs your attention": one line per request that is waiting on the applicant. */
function AttentionSkeleton({ count }: { count: number }) {
  return (
    <section
      data-part="attention"
      aria-hidden="true"
      className="rounded-[28px] bg-card px-5 pt-5 pb-2 shadow-portal-card md:px-7 md:pt-5 md:pb-2"
    >
      <Skeleton className="h-7 w-52 max-w-full" />
      <ul className="mt-2 flex flex-col divide-y divide-border-lighter">
        {Array.from({ length: count }, (_, row) => (
          <li
            key={row}
            className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-3 md:grid-cols-[3rem_minmax(0,1fr)_auto]"
          >
            <Skeleton className="size-12 rounded-2xl" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-5.5 w-3/5" />
              <Skeleton className="h-4.5 w-4/5" />
            </div>
            <Skeleton className="h-11 w-28 rounded-full max-md:col-start-2" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A quiet row per other request still moving, two to a line. */
function OtherRequestsSkeleton({ count }: { count: number }) {
  return (
    <section data-part="rows" aria-hidden="true">
      <div className="mb-2 flex items-center justify-between gap-4">
        <Skeleton className="mx-1.5 h-5 w-40" />
      </div>
      <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
        {Array.from({ length: count }, (_, row) => (
          <li
            key={row}
            className="flex items-center gap-4 rounded-4xl bg-card px-5 py-3.5 shadow-portal-card md:px-6 md:py-3"
          >
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Start a new request": the slim row at the foot of a page that leads with a request. */
function StartRequestSkeleton() {
  return (
    <section
      data-part="start"
      aria-hidden="true"
      className="flex flex-col gap-3.5 md:gap-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Skeleton className="mx-1.5 h-5 w-36" />
        <div className="flex items-center gap-2 md:gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-24 rounded-full md:h-9 md:w-32" />
        </div>
      </div>
      <TilesSkeleton strip />
    </section>
  );
}

/**
 * Everything under the title row, as a silhouette, in the same flex column the
 * real content uses so the swap moves nothing. `shape` says which dashboard
 * this is standing in for: see `DashboardShape`.
 */
export function CitizenDashboardBodySkeleton({
  shape = EMPTY_SHAPE,
  className,
}: {
  shape?: DashboardShape;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-4.5 md:gap-5", className)}>
      <span role="status" className="sr-only">
        Loading your dashboard…
      </span>
      {shape.kind === "empty" ? (
        <PromptSkeleton />
      ) : (
        <>
          {shape.hero ? (
            <HeroSkeleton
              lead={shape.hero.lead}
              done={shape.hero.done}
              captioned={shape.hero.captioned}
              tag={shape.hero.tag}
              compact={shape.rows > 0}
            />
          ) : (
            // "Nothing in progress right now."
            <Skeleton data-part="idle" className="h-20.5 rounded-[28px]" />
          )}
          {shape.attention > 0 && <AttentionSkeleton count={shape.attention} />}
          {shape.rows > 0 && <OtherRequestsSkeleton count={shape.rows} />}
          <StartRequestSkeleton />
        </>
      )}
    </div>
  );
}

/**
 * What the next dashboard will look like, before its requests are known: what
 * this person's last one looked like on this device, else a new account's.
 */
function expectedShape(): DashboardShape {
  const id = peekCurrentUser()?.id;
  return (id && readDashboardShape(id)) || EMPTY_SHAPE;
}

/** The whole dashboard while the route's own data loads: title row, then the body. */
export function CitizenDashboardSkeleton() {
  const shape = expectedShape();

  return (
    <div className="portal-page flex-1 gap-4.5 md:gap-5" aria-busy="true">
      <div className="flex items-center justify-between gap-4 md:gap-6">
        <Skeleton className="h-8 w-72 max-w-full rounded-xl md:h-11" />
        {/* "All requests" only exists once there are requests. */}
        {shape.kind === "requests" && (
          <Skeleton className="hidden h-12 w-36 rounded-full md:block" />
        )}
      </div>
      <CitizenDashboardBodySkeleton shape={shape} />
    </div>
  );
}
