import { useId, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface ReportPanelProps {
  title: ReactNode;
  description?: ReactNode;
  /** Sits opposite the title: a count badge, a button. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The one container every block of the Reports page sits in. It matches the
 * Services, Staff and Request Queue cards, and names itself by its heading so a
 * screen reader can list the page's sections.
 */
export function ReportPanel({
  title,
  description,
  action,
  className,
  children,
}: ReportPanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border border-border-strong bg-card p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-balance text-xl font-bold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-prose text-pretty text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
