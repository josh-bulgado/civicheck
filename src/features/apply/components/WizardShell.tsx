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
    <div className="mx-auto w-full max-w-350 px-5 py-7 sm:px-10">
      <div className={sidebar ? "grid items-start gap-5 lg:grid-cols-[1fr_340px]" : ""}>
        <div className="rounded-xl border border-border-strong bg-white p-6 sm:p-7">
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
        {sidebar && <div className="mt-5 flex flex-col gap-4 lg:mt-0">{sidebar}</div>}
      </div>
    </div>
  );
}
