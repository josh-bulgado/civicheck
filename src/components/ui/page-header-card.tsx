import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface PageHeaderCardProps {
  title: string;
  /** The line under the title: the office, a count, what the page is showing. */
  description: ReactNode;
  className?: string;
  /** The page's actions, on the right. They wrap under the title when narrow. */
  children?: ReactNode;
}

/**
 * The title card at the top of the admin pages (Services, Staff, Request Queue,
 * Notifications, Reports): the page's name, one line saying what it is showing,
 * and the actions that belong to the whole page.
 */
export function PageHeaderCard({
  title,
  description,
  className,
  children,
}: PageHeaderCardProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border-strong bg-card px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
