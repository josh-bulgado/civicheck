import { StageTracker } from "~/features/dashboard/components/StageTracker";
import type { NextStepsView } from "~/features/requests/next-steps";

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

function InstructionText({ text }: { text: string }) {
  const lines = text.split("\n").flatMap(line =>
    Array.from(sentences.segment(line), part => part.segment.trim()).filter(Boolean),
  );
  return <>{lines.map((line, index) => <span key={index} className="block">{line}</span>)}</>;
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
      className="rounded-hero bg-(image:--portal-hero) px-5 py-7 md:px-13 md:pt-11 md:pb-12"
    >
      <StageTracker status={status} />

      {next ? (
        <div className="mt-8 md:mt-10">
          <h2 className="text-[17px] leading-[normal] font-semibold text-body-strong">
            What to do next
          </h2>

          {next.kind === "steps" ? (
            <ol className="mt-4 grid grid-cols-1 gap-3">
              {next.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex min-w-0 items-start gap-3 rounded-2xl bg-card/78 p-4"
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-fill text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] leading-7 font-normal text-foreground break-words">
                    <InstructionText text={step} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl bg-card/78 p-4 text-[15px] leading-7 font-normal text-foreground">
              <InstructionText text={next.text} />
            </p>
          )}
          {next.kind === "steps" && next.registrationNotice ? (
            <p className="mt-4 rounded-2xl bg-card/78 p-4 text-[15px] leading-7 font-normal text-foreground">
              <InstructionText text={next.registrationNotice} />
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
