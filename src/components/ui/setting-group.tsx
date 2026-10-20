import { useId, type ReactNode } from "react";

interface SettingGroupProps {
  title: string;
  /** Short note at the right of the band. */
  aside?: ReactNode;
  /** The id an error-summary link points at; a generated one when omitted. */
  headingId?: string;
  /** Pads the body, for free-form content. Rows that bring their own padding leave it off. */
  padded?: boolean;
  children: ReactNode;
}

/**
 * A titled group inside a section card: a full-width tinted band over its body.
 * It bleeds past the card's side padding (px-6, sm:px-8) so the band and any row
 * dividers run edge to edge.
 */
export function SettingGroup({
  title,
  aside,
  headingId,
  padded = false,
  children,
}: SettingGroupProps) {
  const generatedId = useId();
  const id = headingId ?? generatedId;

  return (
    <section
      aria-labelledby={id}
      className="-mx-6 flex flex-col not-first:border-t sm:-mx-8"
    >
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-surface-subtle px-6 py-3 sm:px-8">
        <h3
          id={id}
          className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        >
          {title}
        </h3>
        {aside ? (
          <div className="text-[13px] font-medium text-muted-foreground sm:text-right">
            {aside}
          </div>
        ) : null}
      </div>
      <div
        className={
          padded
            ? "flex flex-col gap-3.5 px-6 py-5 sm:px-8"
            : "flex flex-col divide-y divide-border"
        }
      >
        {children}
      </div>
    </section>
  );
}
