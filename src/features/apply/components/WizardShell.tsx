interface WizardShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function WizardShell({ title, description, children }: WizardShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-6 px-5 py-10 sm:px-10">
      <div className="flex flex-col gap-2">
        <h1 className="civic-title text-[clamp(1.5rem,3vw,2rem)] leading-tight">
          {title}
        </h1>
        <p className="max-w-155 text-base leading-relaxed text-body">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
