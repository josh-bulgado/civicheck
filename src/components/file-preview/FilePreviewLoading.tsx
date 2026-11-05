import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

/** Keeps the preview's footprint while its file downloads or renders. */
export function FilePreviewLoading({
  label = "Loading preview",
  showToolbar = false,
  className,
}: {
  label?: string;
  showToolbar?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("flex h-full min-h-0 w-full flex-col", className)}
    >
      {showToolbar ? (
        <div aria-hidden="true" className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-4">
          <Skeleton className="h-11.5 w-72 max-w-full rounded-xl" />
          <Skeleton className="ml-auto h-11 w-36 rounded-xl" />
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-surface-subtle p-6",
          showToolbar && "border border-border-light",
        )}
      >
        <Spinner aria-hidden="true" className="size-7 shrink-0 text-primary motion-reduce:animate-none" />
        <span className="text-center text-sm text-muted-foreground">{label}…</span>
      </div>
    </div>
  );
}
