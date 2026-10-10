import { cn } from "~/lib/utils";

/**
 * Marks a field label as required. The asterisk is visual only; screen readers
 * get the word instead, so the requirement is announced with the label and no
 * input needs its own `aria-required`.
 */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

/**
 * Key for the asterisk. Hidden from assistive tech because every marked label
 * already says "required" on its own.
 */
export function RequiredLegend({ className }: { className?: string }) {
  return (
    <p
      aria-hidden="true"
      className={cn("text-xs text-muted-foreground", className)}
    >
      <span className="text-destructive">*</span> Required
    </p>
  );
}
