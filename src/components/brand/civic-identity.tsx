import { useState } from "react";
import { cn } from "~/lib/utils";

type MarkProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

const assetPaths = {
  ccro: "/brand/ccro-emblem.png",
  city: "/brand/city-of-legazpi-seal.png",
} as const;

function OfficialMark({
  src,
  alt,
  fallback,
  className,
}: {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  const [available, setAvailable] = useState(true);

  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-white text-[10px] font-extrabold tracking-tight text-primary",
        className,
      )}
      aria-label={available ? undefined : alt}
    >
      {available ? (
        <img
          src={src}
          alt={alt}
          className="size-full object-contain"
          onError={() => setAvailable(false)}
        />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
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
      <OfficialMark
        src={assetPaths.ccro}
        alt="City Civil Registrar Office emblem"
        fallback="CCRO"
      />
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
      <OfficialMark
        src={assetPaths.city}
        alt="City of Legazpi official seal"
        fallback="CITY"
        className="border-brand-gold/70"
      />
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
