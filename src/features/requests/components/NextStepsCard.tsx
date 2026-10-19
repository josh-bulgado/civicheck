import { cn } from "~/lib/utils";
import { StageTracker } from "~/features/dashboard/components/StageTracker";
import type { NextStepsView } from "~/features/requests/next-steps";

// Spelled out so Tailwind sees every class; steps sit side by side, one column each.
const STEP_COLUMNS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

/**
 * The blue card at the top of an applicant's request page: the four stages as
 * a plain tracker (the history below carries the dates), then what to do next.
 */
export function NextStepsCard({
  status,
  next,
}: {
  status: string;
  /** Null once the request has ended: there is no next to show. */
  next: NextStepsView | null;
}) {
  return (
    <section
      aria-label="Progress"
      className="rounded-hero bg-(image:--portal-hero) px-5 py-7 md:px-13 md:pt-11 md:pb-12"
    >
      <StageTracker status={status} />

      {next ? (
        <div className="mt-8 md:mt-10">
          <h2 className="text-[17px] leading-[normal] font-semibold text-body-strong">
            What to do next
          </h2>

          {next.kind === "steps" ? (
            <ol
              className={cn(
                "mt-4 grid grid-cols-1 gap-3 md:gap-4",
                STEP_COLUMNS[Math.min(next.steps.length, 3)],
              )}
            >
              {next.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-4 rounded-[20px] bg-card/78 px-5 py-4"
                >
                  <span
                    className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-primary-fill text-lg font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[19px] leading-snug font-semibold text-foreground">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-[20px] bg-card/78 px-5 py-4 text-[19px] leading-snug font-semibold text-foreground">
              {next.text}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
