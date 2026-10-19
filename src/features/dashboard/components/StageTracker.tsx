import { Check } from "lucide-react";
import {
  STAGE_LABELS,
  stageOf,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

const STAGES: WorkflowStage[] = [1, 2, 3, 4];

/**
 * The four workflow stages as a row of nodes, for the request page. Finished
 * stages are solid and joined to the next by a line; the stage the request is
 * in is a ring with a dot; the ones still ahead stay faint and unjoined. The
 * dashboard's lead card has its own, larger `LeadTracker`.
 */
export function StageTracker({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  // A released request has been through all four, so none of them is "here".
  const current = status === "released" ? 5 : (stageOf(status) ?? 1);

  return (
    <ol className={cn("grid grid-cols-4", className)} aria-label="Request progress">
      {STAGES.map((stage) => {
        const done = stage < current;
        const here = stage === current;

        return (
          <li key={stage} aria-current={here ? "step" : undefined} className="min-w-0 pr-2 md:pr-3">
            <div className="flex items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-3 text-white md:size-10",
                  done && "border-primary-fill bg-primary-fill",
                  here &&
                    "border-primary bg-card shadow-[0_0_0_5px_rgba(11,77,162,0.18)] md:shadow-[0_0_0_7px_rgba(11,77,162,0.18)]",
                  !done && !here && "border-[#b9c7de] dark:border-border-strong bg-card",
                )}
              >
                {done && (
                  <Check
                    className="size-3.5 md:size-4.75"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
                {here && (
                  <span
                    className="size-2.25 rounded-full bg-primary md:size-3"
                    aria-hidden="true"
                  />
                )}
              </span>
              {stage < 4 && (
                <span
                  className={cn(
                    "mx-1.5 h-0.75 flex-1 rounded-xs md:mx-3.5 md:h-1",
                    done ? "bg-primary" : "bg-[#b9c7de] dark:bg-border-strong",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            {/* Four labels share a phone's width, so they tighten up there and
                give way with an ellipsis before they could run into each other. */}
            <p
              className={cn(
                "mt-2.5 truncate text-[12.5px] leading-[normal] md:mt-4 md:text-lg",
                done || here ? "font-bold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              {STAGE_LABELS[stage]}
              {done && <span className="sr-only"> (done)</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
