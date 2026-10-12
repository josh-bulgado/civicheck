import { cn } from "~/lib/utils";

/**
 * Shown in place of a page while its route data is loading. It's the router's
 * `defaultPendingComponent`, so every route that doesn't ship its own skeleton
 * gets it — notably the pages that would otherwise sit frozen on the previous
 * screen until the loader resolves.
 *
 * Deliberately plain: a ring and one line of text. Routes that know their own
 * layout (the dashboards, request lists) keep their skeletons, which hold the
 * shape of the page better than a generic spinner can.
 */
export function PageLoader({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "civic-enter-fade flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
    >
      <span aria-hidden="true" className="civic-loader-ring" />
      <p className="text-sm font-medium text-muted-foreground">{label}…</p>
    </div>
  );
}
