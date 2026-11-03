import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { KeepDraftDialog } from "~/features/apply/components/KeepDraftDialog";
import {
  describeAlsoPayable,
  parseFeeComponents,
  splitFeeComponents,
  type FeeComponent,
} from "~/features/services/fee-components";
import { formatPesoFee, totalFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

// ─── Fee ─────────────────────────────────────────────────────────────────────

function FeeLines({
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
  /**
   * The applicant has entered something worth keeping. Only then does leaving
   * ask what to do with the draft; with nothing in it there is nothing to ask.
   */
  hasProgress: boolean;
  onDiscard: () => void;
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
  hasProgress,
  onDiscard,
}: ApplicationDocketProps) {
  const navigate = useNavigate();
  const [changing, setChanging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function changeService() {
    if (hasProgress) setChanging(true);
    else void navigate({ to: "/services" });
  }

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

          {selectionPending || serviceFamily ? (
            <p className="mt-0.5 hidden text-sm text-pretty text-muted-foreground md:block">
              {selectionPending
                ? "Answer the questions below to identify the exact service."
                : serviceFamily}
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
          onClick={changeService}
          className="civic-press hidden h-10 shrink-0 items-center rounded-full border border-border bg-card px-4.5 text-[15px] font-semibold whitespace-nowrap text-body-2 transition-colors duration-150 hover:border-primary hover:text-primary md:inline-flex"
        >
          Change service
        </button>
        <button
          type="button"
          aria-label="More about this application"
          onClick={() => setMenuOpen(true)}
          className="civic-press flex size-11 shrink-0 items-center justify-center rounded-full bg-portal-panel text-body-2 hover:bg-border-light md:hidden"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* A phone's "…" opens a sheet that holds only the one safe action. */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
          className="apply-wizard top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-[28px] rounded-b-none bg-card p-4 pb-6 shadow-portal-dialog ring-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">Application options</DialogTitle>
          <DialogDescription className="sr-only">
            Change the service you are applying for.
          </DialogDescription>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              changeService();
            }}
            className="civic-press h-13.5 w-full rounded-full border border-border bg-card text-base font-semibold text-foreground hover:bg-primary-tint"
          >
            Change service
          </button>
        </DialogContent>
      </Dialog>

      <KeepDraftDialog
        open={changing}
        onOpenChange={setChanging}
        serviceName={serviceName}
        destination="/services"
        onDiscard={onDiscard}
      />
    </section>
  );
}
