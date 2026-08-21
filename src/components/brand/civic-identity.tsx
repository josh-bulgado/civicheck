import { cn } from "~/lib/utils";

type MarkProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

/**
 * Text-only placeholder: no MOA is in place authorizing use of the CCRO or
 * City of Legazpi official seals, so render initials instead of the real
 * artwork. Swap in the actual emblem once that authorization exists.
 */
function OfficialMark({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-white text-[10px] font-extrabold tracking-tight text-primary",
        className,
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function CiviCheckIdentity({
  className,
  compact = false,
  inverse = false,
}: MarkProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <OfficialMark label="CCRO" />
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block truncate text-lg font-extrabold tracking-[-0.025em]",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          CiviCheck
        </span>
        {compact ? null : (
          <span
            className={cn(
              "block truncate text-[11px] font-medium",
              inverse ? "text-sidebar-muted" : "text-muted-foreground",
            )}
          >
            City Civil Registrar Office
          </span>
        )}
      </span>
    </span>
  );
}

export function CityGovernmentIdentity({
  className,
  compact = false,
  inverse = false,
}: MarkProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <OfficialMark label="CITY" className="border-brand-gold/70" />
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block truncate text-xs font-bold uppercase tracking-[0.08em]",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          City of Legazpi
        </span>
        {compact ? null : (
          <span
            className={cn(
              "block truncate text-[11px]",
              inverse ? "text-white/70" : "text-muted-foreground",
            )}
          >
            City Government
          </span>
        )}
      </span>
    </span>
  );
}
