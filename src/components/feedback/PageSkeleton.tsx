import type { ReactNode } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type SkeletonProps = { label?: string; className?: string };
type LoadingHeadingProps = { title?: string; description?: ReactNode; actionLabel?: string };

/** Fixed page copy is available before its records; only values need placeholders. */
export function SkeletonHeading({ title, description, actionLabel }: LoadingHeadingProps) {
  if (!title) return null;
  return (
    <PageHeaderCard title={title} description={description}>
      {actionLabel ? <Button disabled size="sm">{actionLabel}</Button> : null}
    </PageHeaderCard>
  );
}

/** Fallback for every route, including routes added without a custom skeleton. */
export function PageSkeleton({
  label = "Loading page",
  className,
  title,
  description,
  actionLabel,
}: SkeletonProps & LoadingHeadingProps) {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("dashboard-page min-w-0", className)}
    >
      <SkeletonHeading title={title} description={description} actionLabel={actionLabel} />
      <div
        aria-hidden="true"
        className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
      >
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function TablePageSkeleton({
  label = "Loading records",
  columns = 6,
  avatar = false,
  title,
  description,
  actionLabel,
  columnLabels,
  searchPlaceholder = "Search records",
}: {
  label?: string;
  columns?: number;
  avatar?: boolean;
  columnLabels?: readonly string[];
  searchPlaceholder?: string;
} & LoadingHeadingProps) {
  const columnCount = columnLabels?.length ?? columns;
  const style = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label={label}
      aria-busy="true"
      className="dashboard-page min-w-0"
    >
      <SkeletonHeading title={title} description={description} actionLabel={actionLabel} />
      <div
        className="overflow-hidden rounded-[22px] border border-border-strong bg-card"
      >
        <div className="flex flex-wrap justify-between gap-4 border-b border-border-light p-5">
          <Input disabled aria-label={searchPlaceholder} placeholder={searchPlaceholder} className="h-10 w-80 max-w-full rounded-full" />
        </div>
        <div className="overflow-hidden">
          {columnLabels ? (
          <div
            className="grid min-w-[760px] gap-6 border-b border-border-light bg-surface-subtle px-6 py-4"
            style={style}
          >
            {columnLabels.map((heading) => <span key={heading} className="text-xs font-semibold text-muted-foreground">{heading}</span>)}
          </div>
          ) : null}
          {Array.from({ length: 6 }, (_, row) => (
            <div
              key={row}
              aria-hidden="true"
              className="grid min-h-[68px] min-w-[760px] items-center gap-6 border-b border-border-lighter px-6 py-3 last:border-b-0"
              style={style}
            >
              {Array.from({ length: columnCount }, (_, col) => (
                <div key={col} className="flex items-center gap-3">
                  {avatar && col === 0 ? (
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-full max-w-36" />
                    {col === 0 ? <Skeleton className="h-3 w-4/5" /> : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CatalogPageSkeleton({ audience = "applicant" }: { audience?: "applicant" | "staff" } = {}) {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label="Loading services"
      aria-busy="true"
      className={audience === "applicant" ? "portal-page min-w-0 gap-4.5 md:gap-6" : "dashboard-page min-w-0"}
    >
      {audience === "applicant" ? <h1 className="portal-title">Browse services</h1> : <PageHeaderCard title="Service Reference" description={<Skeleton className="h-4 w-64 max-w-full" />} />}
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          <Input disabled aria-label="Search services" placeholder="Search services" className="h-11 w-96 max-w-full rounded-full" />
        </div>
        <div aria-hidden="true" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="space-y-5 rounded-3xl border border-border-light bg-card p-6"
            >
              <Skeleton className="size-14 rounded-2xl" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EditorPageSkeleton({ title }: { title?: string } = {}) {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label="Loading editor"
      aria-busy="true"
      className="flex min-h-svh min-w-0 w-full flex-col gap-6 p-5 sm:p-8"
    >
      {title ? <SkeletonHeading title={title} /> : <Skeleton aria-hidden="true" className="h-9 w-64 max-w-full" />}
      <div
        aria-hidden="true"
        className="grid flex-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"
      >
        <div className="hidden space-y-4 rounded-2xl border border-border-light bg-card p-5 lg:block">
          {["Registry & Fees", "Citizen Journey", "Timing & Routing", "Application Form", "Requirements", "Relationships"].map((section) => (
            <div key={section} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground">{section}</div>
          ))}
        </div>
        <div className="space-y-6 rounded-2xl border border-border-light bg-card p-6">
          <Skeleton className="h-7 w-64 max-w-full" />
          <PanelSkeleton label="Loading form" rows={4} />
        </div>
      </div>
    </div>
  );
}

export function PanelSkeleton({
  label = "Loading details",
  rows = 3,
  className,
}: SkeletonProps & { rows?: number }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("min-w-0 space-y-5", className)}
    >
      <div aria-hidden="true" className="space-y-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentSkeleton({
  label = "Loading document",
  className,
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        "flex h-full min-h-48 min-w-0 w-full items-start justify-center overflow-hidden p-5",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex aspect-[1/1.414] w-full max-w-md flex-col gap-5 rounded-lg border border-border-light bg-card p-6 shadow-sm"
      >
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
