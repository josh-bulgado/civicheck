import { StageTracker } from "~/features/dashboard/components/StageTracker";
import type { NextStepsView } from "~/features/requests/next-steps";

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

function InstructionText({ text }: { text: string }) {
  const lines = text.split("\n").flatMap(line =>
    Array.from(sentences.segment(line), part => part.segment.trim()).filter(Boolean),
  );
  return <>{lines.map((line, index) => <span key={index} className="block max-md:text-pretty">{line}</span>)}</>;
}

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
      className="rounded-hero bg-(image:--portal-hero) px-4 py-5 md:px-13 md:pt-11 md:pb-12"
    >
      <StageTracker status={status} />

      {next ? (
        <div className="mt-6 md:mt-10">
          <h2 className="text-base leading-[normal] font-semibold text-body-strong md:text-[17px]">
            What to do next
          </h2>

          {next.kind === "steps" ? (
            <ol className="mt-3 grid grid-cols-1 gap-2.5 md:mt-4 md:gap-3">
              {next.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex min-w-0 items-start gap-2.5 rounded-2xl bg-card/78 p-3.5 md:gap-3 md:p-4"
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-fill text-xs font-semibold text-white md:size-7 md:text-sm"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-[1.375rem] font-normal text-foreground break-words md:text-[15px] md:leading-7">
                    <InstructionText text={step} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-2xl bg-card/78 p-3.5 text-sm leading-[1.375rem] font-normal text-foreground md:mt-4 md:p-4 md:text-[15px] md:leading-7">
              <InstructionText text={next.text} />
            </p>
          )}
          {next.kind === "steps" && next.registrationNotice ? (
            <p className="mt-3 rounded-2xl bg-card/78 p-3.5 text-sm leading-[1.375rem] font-normal text-foreground md:mt-4 md:p-4 md:text-[15px] md:leading-7">
              <InstructionText text={next.registrationNotice} />
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
