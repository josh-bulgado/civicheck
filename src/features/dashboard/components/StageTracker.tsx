import { Check } from "lucide-react";
import {
  STAGE_LABELS,
  isRequestStatus,
  stageOf,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

const STAGES: WorkflowStage[] = [1, 2, 3, 4];

/**
 * The four workflow stages as a row of nodes, for the request page. Finished
 * stages are solid and joined to the next by a line; the stage the request is
 * in is a ring with a dot. Mobile centers every label under its node and keeps
 * all connecting lines visible, with stronger lines for completed stages. The
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
    <ol className={cn("@container grid grid-cols-4", className)} aria-label="Request progress">
      {STAGES.map((stage) => {
        const done = stage < current;
        const here = stage === current;
        const live = here && isRequestStatus(status) && status !== "rejected" && status !== "cancelled";

        return (
          <li key={stage} aria-current={here ? "step" : undefined} className="min-w-0 md:pr-1 md:@sm:pr-2 md:@md:pr-3 max-md:relative max-md:flex max-md:flex-col max-md:items-center">
            <div className="flex items-center max-md:justify-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-3 text-white md:size-7 md:@md:size-10 max-md:relative max-md:z-10",
                  done && "border-primary-fill bg-primary-fill",
                  here &&
                    "border-primary bg-card shadow-[0_0_0_5px_rgba(11,77,162,0.18)] md:@md:shadow-[0_0_0_7px_rgba(11,77,162,0.18)]",
                  live && "civic-live-step",
                  !done && !here && "border-primary/60 bg-card md:border-[#b9c7de] md:dark:border-border-strong",
                )}
              >
                {done && (
                  <Check
                    className="size-3.5 md:@md:size-4.75"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
                {here && (
                  <span
                    className="size-2.25 rounded-full bg-primary md:@md:size-3"
                    aria-hidden="true"
                  />
                )}
              </span>
              {stage < 4 && (
                <span
                  className={cn(
                    "h-0.75 rounded-xs md:mx-1.5 md:flex-1 md:@md:mx-3.5 md:@md:h-1 max-md:absolute max-md:top-4 max-md:left-1/2 max-md:w-full max-md:-translate-y-1/2",
                    done ? "bg-primary" : "bg-primary/65 md:bg-[#b9c7de] md:dark:bg-border-strong",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            {/* Labels stay complete at phone widths and may wrap for enlarged text. */}
            <p
              className={cn(
                "mt-2 text-[0.6875rem] leading-tight min-[360px]:text-xs md:mt-2.5 md:text-[10px] md:tracking-[-0.02em] md:whitespace-nowrap md:@sm:text-[12.5px] md:@sm:tracking-normal md:@md:mt-4 md:@md:text-lg md:@md:leading-[normal] max-md:w-full max-md:text-center max-md:wrap-anywhere",
                done || here ? "font-bold text-foreground max-md:font-semibold" : "font-medium text-muted-foreground",
                "max-md:text-foreground",
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
