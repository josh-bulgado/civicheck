import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  parseFeeComponents,
  splitFeeComponents,
} from "~/features/services/fee-components";
import { formatPesoFee, totalFee } from "~/features/services/service-utils";
import { FeeLines } from "~/features/services/components/FeeLines";

// ─── Fee ─────────────────────────────────────────────────────────────────────


// ─── Docket ──────────────────────────────────────────────────────────────────

interface ApplicationDocketProps {
  serviceName: string;
  serviceFamily?: string;
  fee?: number | string;
  /** The service's itemized charges, when it has them: the fee opens them. */
  feeComponents?: unknown;
  /** Quantity and whether `fee` is per copy — together they set the total shown. */
  copies?: number;
  feePerCopy?: boolean;
  selectionPending: boolean;
  /** Shared with the mobile header; disabled while the draft is loading. */
  onChangeService?: () => void;
}

/**
 * The selected service and its fee: the one place in the wizard the fee is
 * stated. "Change service" is the lightest thing in the band, so the eye goes
 * to the fee, then to Next.
 */
export function ApplicationDocket({
  serviceName,
  serviceFamily,
  fee,
  feeComponents,
  copies = 1,
  feePerCopy = false,
  selectionPending,
  onChangeService,
}: ApplicationDocketProps) {
  const showCopies = feePerCopy && fee !== undefined && copies > 1;
  // A per-copy service already shows "₱X × n copies"; it carries no breakdown.
  const { included, alsoPayable } = splitFeeComponents(
    feePerCopy ? [] : parseFeeComponents(feeComponents),
  );
  const hasBreakdown = included.length > 1 || alsoPayable.length > 0;
  const feeLabel = fee !== undefined ? formatPesoFee(totalFee(fee, copies, feePerCopy)) : null;

  return (
    <section
      role="region"
      aria-labelledby="selected-service-title"
      className="w-full px-3 sm:px-8 md:px-14"
    >
      <div className="mx-auto flex max-w-353.5 items-center gap-4 rounded-4xl bg-card px-5 py-4 shadow-portal-card md:gap-7 md:px-7.5 md:py-4.5">
        <div className="min-w-0 flex-1">
          {/* On a phone the band is just the name and the fee. */}
          <div className="mb-0.5 hidden flex-wrap items-center gap-x-2.5 md:flex">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
              Selected service
            </p>
            {/* Whether the service is settled is still tracked and read out by
                assistive tech; it just isn't drawn on screen. */}
            <span className="sr-only">{selectionPending ? "Not confirmed" : "Confirmed"}</span>
          </div>

          <h2
            id="selected-service-title"
            className="min-w-0 text-base leading-snug font-semibold text-pretty text-foreground md:text-[21px]"
          >
            {serviceName}
          </h2>

          {!selectionPending && serviceFamily ? (
            <p className="mt-0.5 hidden text-sm text-pretty text-muted-foreground md:block">
              {serviceFamily}
            </p>
          ) : null}
        </div>

        {feeLabel !== null ? (
          <dl className="shrink-0 border-l border-border-light pl-4 leading-tight md:pl-6">
            <dt className="text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Fee at cashier
            </dt>
            <dd className="mt-0.5 text-lg font-bold text-foreground tabular-nums md:text-[21px]">
              {hasBreakdown ? (
                <Popover>
                  <PopoverTrigger
                    className="civic-press -mx-1 rounded-md px-1 underline decoration-[#b9c7de] dark:decoration-border-strong decoration-dashed underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`${feeLabel}, see what the fee covers`}
                  >
                    {feeLabel}
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={10}
                    className="apply-wizard flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3.5 rounded-[20px] border-0 bg-card p-5 shadow-portal-popover ring-0"
                  >
                    <FeeLines title="What the fee covers" lines={included} />
                    {alsoPayable.length > 0 ? (
                      <FeeLines
                        title="Also payable, not in the amount above"
                        lines={alsoPayable}
                        muted
                      />
                    ) : null}
                  </PopoverContent>
                </Popover>
              ) : (
                feeLabel
              )}
            </dd>
            {showCopies ? (
              <dd className="text-[13px] text-muted-foreground tabular-nums">
                {formatPesoFee(fee)} × {copies} copies
              </dd>
            ) : null}
          </dl>
        ) : null}

        <button
          type="button"
          onClick={onChangeService}
          disabled={!onChangeService}
          className="civic-press hidden h-10 shrink-0 items-center rounded-full border border-border bg-card px-4.5 text-[15px] font-semibold whitespace-nowrap text-body-2 transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-50 md:inline-flex"
        >
          Change service
        </button>
      </div>
    </section>
  );
}
