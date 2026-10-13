import { enterDelay } from "~/components/motion/stagger";

interface WizardShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  /** Intro line under the title; a step that doesn't need one leaves it out. */
  description?: string;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function WizardShell({
  step,
  title,
  description,
  sidebar,
  children,
}: WizardShellProps) {
  return (
    // Every wizard step renders through here, so keying on the step number is
    // what makes moving between them feel like a step rather than a redraw: the
    // card is torn down and rebuilt, which replays the entrance.
    <div key={step} className="mx-auto w-full px-3 py-5 sm:px-8 sm:py-7">
      {/* The card is the same 1054px on every step; a step with a sidebar
          adds the sidebar's column beside it instead of narrowing the card. */}
      <div
        className={
          sidebar
            ? "mx-auto grid max-w-353.5 items-start gap-5 lg:grid-cols-[1fr_340px]"
            : "mx-auto max-w-263.5"
        }
      >
        <div className="civic-enter portal-card p-4 sm:p-7.5">
          <div className="flex flex-col gap-1.5 pb-5">
            <h1 className="civic-title text-[clamp(1.5rem,2.6vw,1.875rem)] leading-tight">
              {title}
            </h1>
            {description ? (
              <p className="max-w-155 text-[15px] leading-relaxed text-body">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
        {sidebar && (
          <div
            // Sticks below the pinned selected-service band (about 7rem
            // tall) rather than sliding underneath it.
            className="civic-enter mt-5 flex flex-col gap-4 lg:sticky lg:top-32 lg:mt-0"
            style={enterDelay(90)}
          >
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
