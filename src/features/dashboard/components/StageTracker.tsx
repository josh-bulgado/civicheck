import { Check } from "lucide-react";
import {
  STAGE_LABELS,
  stageOf,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";
import type { TrackerDetails } from "../hero";

const STAGES: WorkflowStage[] = [1, 2, 3, 4];

/**
 * The four workflow stages as a row of nodes, shared by the dashboard hero and
 * the request page. Finished stages are solid and joined to the next by a
 * line; the stage the request is in is a ring with a dot; the ones still ahead
 * stay faint and unjoined.
 *
 * Without `details` it is just the four labels and their nodes. With them, a
 * finished stage shows its date and the current one a line and a tag. Those
 * columns are too narrow on a phone, so there the caller shows the line under
 * the tracker instead.
 */
export function StageTracker({
  status,
  details,
  fluid = false,
  className,
}: {
  status: string;
  details?: TrackerDetails;
  /**
   * Desktop sizes follow the window's height, from the compact floor (nodes
   * 32px) up to a generous ceiling (52px). For a hero that takes whatever
   * height the page has left, so the tracking uses the room instead of leaving
   * it empty. Without it the sizes are fixed.
   */
  fluid?: boolean;
  className?: string;
}) {
  // A released request has been through all four, so none of them is "here".
  const current = status === "released" ? 5 : (stageOf(status) ?? 1);

  return (
    <ol className={cn("grid grid-cols-4", className)} aria-label="Request progress">
      {STAGES.map((stage) => {
        const done = stage < current;
        const here = stage === current;
        const date = done ? details?.dates[stage] : undefined;

        return (
          <li key={stage} aria-current={here ? "step" : undefined} className="min-w-0 pr-2 md:pr-3">
            <div className="flex items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-3 text-white",
                  fluid ? "md:size-[clamp(2rem,4.6vh,3.25rem)]" : "md:size-10",
                  done && "border-primary bg-primary",
                  here &&
                    "border-primary bg-white shadow-[0_0_0_5px_rgba(11,77,162,0.18)]",
                  here &&
                    (fluid
                      ? "md:shadow-[0_0_0_clamp(5px,0.8vh,9px)_rgba(11,77,162,0.18)]"
                      : "md:shadow-[0_0_0_7px_rgba(11,77,162,0.18)]"),
                  !done && !here && "border-[#b9c7de] bg-white",
                )}
              >
                {done && (
                  <Check
                    className={cn(
                      "size-3.5",
                      fluid ? "md:size-[clamp(1rem,2.4vh,1.625rem)]" : "md:size-4.75",
                    )}
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
                {here && (
                  <span
                    className={cn(
                      "size-2.25 rounded-full bg-primary",
                      fluid ? "md:size-[clamp(0.625rem,1.5vh,1rem)]" : "md:size-3",
                    )}
                    aria-hidden="true"
                  />
                )}
              </span>
              {stage < 4 && (
                <span
                  className={cn(
                    "mx-1.5 h-0.75 flex-1 rounded-xs md:mx-2.5",
                    fluid
                      ? "md:mx-[clamp(0.75rem,1.6vh,1.5rem)] md:h-[clamp(3px,0.5vh,6px)]"
                      : "md:mx-3.5 md:h-1",
                    done ? "bg-primary" : "bg-[#b9c7de]",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            {/* Four labels share a phone's width, so they tighten up there and
                give way with an ellipsis before they could run into each other. */}
            <p
              className={cn(
                "mt-2.5 truncate text-[12.5px] leading-[normal]",
                fluid
                  ? "md:mt-[clamp(0.625rem,1.8vh,1.25rem)] md:text-[clamp(1rem,2.4vh,1.375rem)]"
                  : "md:mt-4 md:text-lg",
                done || here ? "font-bold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              {STAGE_LABELS[stage]}
              {done && <span className="sr-only"> (done)</span>}
            </p>
            {date ? (
              <p
                className={cn(
                  "hidden leading-[normal] text-body-2 md:block",
                  fluid
                    ? "mt-0.5 md:text-[clamp(0.8125rem,1.8vh,1.0625rem)]"
                    : "mt-0.75 text-sm",
                )}
              >
                {date}
              </p>
            ) : null}
            {here && details && (details.note || details.tag) ? (
              <div className="hidden md:block">
                {details.note ? (
                  <p
                    className={cn(
                      "leading-[1.3] text-portal-ink-2",
                      fluid
                        ? "mt-1 md:text-[clamp(0.875rem,2vh,1.1875rem)]"
                        : "mt-1.5 text-[15px]",
                    )}
                  >
                    {details.note}
                  </p>
                ) : null}
                {details.tag ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 font-semibold",
                      fluid
                        ? "mt-[clamp(0.375rem,1vh,0.625rem)] h-[clamp(1.5rem,3.2vh,2rem)] px-[clamp(0.75rem,1.6vh,1rem)] text-[clamp(0.75rem,1.6vh,0.9375rem)]"
                        : "mt-2 h-7 text-[13px]",
                      details.tag.tone === "action"
                        ? "bg-portal-danger-soft text-destructive"
                        : "bg-white/75 text-primary-hover",
                    )}
                  >
                    {details.tag.label}
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
