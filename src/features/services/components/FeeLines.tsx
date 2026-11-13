import { describeAlsoPayable, type FeeComponent } from "../fee-components";
import { formatPesoFee } from "../service-utils";
import { cn } from "~/lib/utils";

export function FeeLines({
  title,
  lines,
  muted = false,
}: {
  title: string;
  lines: FeeComponent[];
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </p>
      <dl className="flex flex-col gap-1.5">
        {lines.map((line, index) => (
          <div
            // Labels are admin-authored and may repeat, so the position is part of the key.
            key={`${line.label}-${index}`}
            className="flex justify-between gap-3 text-[15px]"
          >
            <dt className={muted ? "text-muted-foreground" : "text-body-2"}>{line.label}</dt>
            <dd
              className={cn(
                "shrink-0 tabular-nums",
                muted ? "text-muted-foreground" : "font-semibold text-foreground",
              )}
            >
              {/* Only "also payable" lines (muted) carry a unit and a note. */}
              {muted ? describeAlsoPayable(line) : formatPesoFee(line.amount)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
