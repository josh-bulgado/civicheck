import { Check } from "lucide-react";
import { STAGE_LABELS, type WorkflowStage } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";
import { trackerProgress, type TrackerDetails } from "../hero";

const STAGES: WorkflowStage[] = [1, 2, 3, 4];

/**
 * The four workflow stages for the dashboard's lead card, whatever state the
 * request is in: finished stages solid and joined to the next by a line, the
 * stage the request is in a ring with a dot, the ones ahead faint. Its sizes
 * follow the window's height, and it runs most of the card's width (the caller
 * sets how far), with Release at its right edge. The request page's own
 * progress is the smaller `StageTracker`.
 *
 * A submitted request has finished Submission and nothing is under way yet, so
 * no stage is "here"; a released one has finished all four. Any other status is
 * in its own stage, with the ones before it done (see `trackerProgress`).
 *
 * `captions` is the line under a stage's label, and `tag` a pill under the
 * stage the request is in. They are too wide for four phone columns, so they
 * show from tablet up.
 */
export function LeadTracker({
  status,
  captions = {},
  tag = null,
  className,
}: {
  status: string;
  captions?: Partial<Record<WorkflowStage, string>>;
  /** `action` is red: the applicant has something to do. */
  tag?: TrackerDetails["tag"];
  className?: string;
}) {
  const { done: doneThrough, here: hereStage } = trackerProgress(status);

  return (
    <ol className={cn("flex", className)} aria-label="Request progress">
      {STAGES.map((stage) => {
        const done = stage <= doneThrough;
        const here = stage === hereStage;

        return (
          // The first three share the width and the last is only as wide as its
          // own text, so Release ends at the right edge with the lines between
          // the stages as long as they can be.
          <li
            key={stage}
            aria-current={here ? "step" : undefined}
            className={cn("min-w-0", stage < 4 ? "flex-1 pr-2 md:pr-3" : "shrink-0")}
          >
            <div className="flex items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-3 md:size-[clamp(2rem,4.6vh,3.25rem)]",
                  done && "border-primary-fill bg-primary-fill text-white",
                  here &&
                    "border-primary bg-card shadow-[0_0_0_5px_rgba(11,77,162,0.18)] md:shadow-[0_0_0_clamp(5px,0.8vh,9px)_rgba(11,77,162,0.18)]",
                  !done &&
                    !here &&
                    "border-[#d3deef] bg-card/70 dark:border-border-strong dark:bg-card",
                )}
              >
                {done ? (
                  <Check
                    className="size-3.5 md:size-[clamp(1rem,2.4vh,1.625rem)]"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={cn(
                      "size-2.25 rounded-full md:size-[clamp(0.625rem,1.5vh,1rem)]",
                      here ? "bg-primary" : "bg-muted-foreground/70",
                    )}
                    aria-hidden="true"
                  />
                )}
              </span>
              {stage < 4 && (
                <span
                  className={cn(
                    "mx-1.5 h-0.75 flex-1 rounded-xs md:mx-[clamp(0.75rem,1.6vh,1.5rem)] md:h-[clamp(3px,0.5vh,6px)]",
                    done ? "bg-primary" : "bg-[#b9c7de] dark:bg-border-strong",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            {/* Four labels share a phone's width, so they give way with an
                ellipsis before they could run into each other. */}
            <p className="mt-2.5 truncate text-[12.5px] leading-[normal] font-bold text-foreground md:mt-[clamp(0.625rem,1.8vh,1.25rem)] md:text-[clamp(1rem,2.4vh,1.375rem)]">
              {STAGE_LABELS[stage]}
              <span className="sr-only">
                {done ? " (done)" : here ? " (current)" : " (pending)"}
              </span>
            </p>
            {captions[stage] || (here && tag) ? (
              // Release is only as wide as its label, so the lines before it
              // stay as long as they can. Its caption and tag are wider than
              // that, so they hang off the label's right edge in a box that
              // takes no width, and the caption wraps at a fixed width.
              <div className={cn("hidden md:block", stage === 4 && "w-0")}>
                {captions[stage] ? (
                  <p
                    className={cn(
                      "mt-0.5 leading-[normal] text-muted-foreground md:text-[clamp(0.875rem,2vh,1.1875rem)]",
                      stage === 4 && "w-max max-w-[16rem]",
                    )}
                  >
                    {captions[stage]}
                  </p>
                ) : null}
                {here && tag ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full font-semibold whitespace-nowrap md:mt-[clamp(0.375rem,1vh,0.625rem)] md:h-[clamp(1.5rem,3.2vh,2rem)] md:px-[clamp(0.75rem,1.6vh,1rem)] md:text-[clamp(0.75rem,1.6vh,0.9375rem)]",
                      tag.tone === "action"
                        ? "bg-portal-danger-soft text-destructive"
                        : "bg-card/75 text-primary-hover",
                    )}
                  >
                    {tag.label}
                  </span>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
