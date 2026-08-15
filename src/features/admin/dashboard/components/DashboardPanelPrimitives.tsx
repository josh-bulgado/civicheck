import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PanelHeader({
  eyebrow,
  title,
  description,
  actionHref,
  headingId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  headingId: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <p className="civic-eyebrow mb-1">{eyebrow}</p>
        <h2 id={headingId} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <a
        href={actionHref}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
      >
        View request queue <ArrowRight className="size-4" />
      </a>
    </div>
  );
}

export function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-5 text-center ${compact ? "py-10" : "border-t border-border py-14"}`}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
