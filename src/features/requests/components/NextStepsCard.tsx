import { RegistrationNoticeText } from "./RegistrationNoticeText";
import { StageTracker } from "~/features/dashboard/components/StageTracker";
import type { NextStepsView } from "~/features/requests/next-steps";

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
  if (status === "cancelled") return null;

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
            <ol className="mt-4 grid grid-cols-1 gap-3 md:gap-4">
              {next.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex min-w-0 items-start gap-4 rounded-[20px] bg-card/78 px-5 py-4"
                >
                  <span
                    className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-primary-fill text-lg font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[19px] leading-snug font-semibold text-foreground break-words">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-[20px] bg-card/78 px-5 py-4 text-[19px] leading-snug font-semibold text-foreground">
              <RegistrationNoticeText text={next.text} />
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
