import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { FeeLines } from "~/features/services/components/FeeLines";
import { parseFeeComponents, splitFeeComponents } from "~/features/services/fee-components";
import { formatPesoFee, totalFee } from "~/features/services/service-utils";

export function WalkInFee({ fee, feeComponents, feePerCopy = false, copies = 1 }: {
  fee: number;
  feeComponents?: unknown;
  feePerCopy?: boolean;
  copies?: number;
}) {
  const { included, alsoPayable } = splitFeeComponents(feePerCopy ? [] : parseFeeComponents(feeComponents));
  const amount = totalFee(fee, copies, feePerCopy);
  const lines = included.length ? included : [{ label: feePerCopy ? "Copy fee" : "Service fee", amount, included: true }];
  const className = "rounded-md bg-primary-soft px-3 py-1 text-sm font-semibold text-primary";
  const label = `Fee: ${formatPesoFee(amount)}`;

  return (
    <Popover>
      <PopoverTrigger type="button" className={`${className} cursor-pointer underline decoration-dashed underline-offset-4 outline-none hover:bg-primary-soft/80 focus-visible:ring-2 focus-visible:ring-primary`}
        aria-label={`${label}, see what the fee covers`}>
        {label}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3.5 overflow-y-auto rounded-xl p-5">
        <FeeLines title="What the fee covers" lines={lines} />
        {feePerCopy ? <p className="text-sm text-muted-foreground">{formatPesoFee(fee)} per copy × {copies} {copies === 1 ? "copy" : "copies"}</p> : null}
        {alsoPayable.length ? <FeeLines title="Also payable, not in the amount above" lines={alsoPayable} muted /> : null}
      </PopoverContent>
    </Popover>
  );
}
