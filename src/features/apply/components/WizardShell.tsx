import { enterDelay } from "~/components/motion/stagger";

interface WizardShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
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
    <div key={step} className="mx-auto w-full max-w-350 px-5 py-7 sm:px-8">
      <div
        className={
          sidebar
            ? "grid items-start gap-5 lg:grid-cols-[1fr_340px]"
            : "mx-auto max-w-5xl"
        }
      >
        <div className="civic-enter civic-card p-6 sm:p-7">
          <div className="flex flex-col gap-1.5 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Step {step} of 4
            </p>
            <h1 className="civic-title text-[clamp(1.375rem,2.6vw,1.75rem)] leading-tight">
              {title}
            </h1>
            <p className="max-w-155 text-sm leading-relaxed text-body">
              {description}
            </p>
          </div>
          {children}
        </div>
        {sidebar && (
          <div
            className="civic-enter mt-5 flex flex-col gap-4 lg:sticky lg:top-6 lg:mt-0"
            style={enterDelay(90)}
          >
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
