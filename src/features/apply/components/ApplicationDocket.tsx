import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Info, MoreHorizontal, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  describeAlsoPayable,
  parseFeeComponents,
  splitFeeComponents,
  type FeeComponent,
} from "~/features/services/fee-components";
import { formatPesoFee, totalFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

// ─── Change service ──────────────────────────────────────────────────────────
// The trigger says what it does ("Change service"), never "Cancel": in a wizard
// "Cancel" reads as "throw my application away". Both ways out lead to Browse
// Services; the one question is what happens to the draft.

const DIALOG_PANEL =
  "w-[min(33.75rem,calc(100%-2rem))] max-w-none gap-0 overflow-hidden rounded-[28px] bg-card p-8 pb-7 shadow-portal-dialog ring-0 sm:max-w-none max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:px-6";

const PILL_BASE =
  "civic-press inline-flex h-13.5 min-w-0 flex-1 items-center justify-center rounded-full px-4 text-base font-semibold whitespace-nowrap";

function ChangeServiceDialog({
  open,
  onOpenChange,
  serviceName,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  onDiscard: () => void;
}) {
  const navigate = useNavigate();
  // "Discard draft" does not delete on the first press: the same panel asks once more.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const keepDraft = useRef<HTMLButtonElement>(null);
  const goBack = useRef<HTMLButtonElement>(null);

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) setConfirmingDiscard(false);
  }

  function leave() {
    close(false);
    void navigate({ to: "/services" });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        initialFocus={confirmingDiscard ? goBack : keepDraft}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
        className={cn("apply-wizard", DIALOG_PANEL)}
      >
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close"
              className="civic-press absolute top-5 right-5 flex size-10 items-center justify-center rounded-full bg-portal-panel text-foreground hover:bg-border-light"
            />
          }
        >
          <X className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
        </DialogClose>

        <DialogTitle className="pr-12 font-sans text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-foreground">
          {confirmingDiscard ? "Discard this draft?" : "Keep your draft?"}
        </DialogTitle>

        <div className="mt-5 rounded-2xl bg-portal-panel px-4.5 py-3.5">
          <p className="text-[13px] leading-[normal] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Your draft
          </p>
          <p className="mt-1 text-lg leading-snug font-bold text-foreground">{serviceName}</p>
        </div>

        {confirmingDiscard ? (
          <DialogDescription className="mt-4 text-base leading-snug text-body-2">
            Your answers and uploaded files will be deleted.
          </DialogDescription>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            <DialogDescription className="text-base leading-snug text-body-2">
              Finish it later on this device, or start fresh.
            </DialogDescription>
            <p className="flex items-start gap-2 text-[15px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 size-4.25 shrink-0" aria-hidden="true" />
              Uploaded documents do not transfer between services.
            </p>
          </div>
        )}

        {/* Side by side from `sm`; on a phone they stack with the safe one on
            top (the reverse order puts the left button last). */}
        <div className="mt-6.5 flex flex-col-reverse gap-3 sm:flex-row">
          {confirmingDiscard ? (
            <>
              <button
                ref={goBack}
                type="button"
                onClick={() => setConfirmingDiscard(false)}
                className={cn(
                  PILL_BASE,
                  "border border-border bg-card text-foreground hover:bg-primary-tint focus-visible:ring-4 focus-visible:ring-primary/20",
                )}
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => {
                  onDiscard();
                  leave();
                }}
                className={cn(PILL_BASE, "bg-destructive text-white dark:text-background hover:bg-destructive/90")}
              >
                Discard draft
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmingDiscard(true)}
                className={cn(
                  PILL_BASE,
                  "border border-border bg-card text-destructive hover:bg-portal-danger-soft",
                )}
              >
                Discard draft
              </button>
              <button
                ref={keepDraft}
                type="button"
                onClick={leave}
                className={cn(
                  PILL_BASE,
                  "bg-primary-fill text-white shadow-[0_8px_20px_rgba(11,77,162,0.28)] hover:bg-primary-fill-hover",
                )}
              >
                Keep draft
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  onDiscard,
}: ApplicationDocketProps) {
  const [changing, setChanging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          onClick={() => setChanging(true)}
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
              setChanging(true);
            }}
            className="civic-press h-13.5 w-full rounded-full border border-border bg-card text-base font-semibold text-foreground hover:bg-primary-tint"
          >
            Change service
          </button>
        </DialogContent>
      </Dialog>

      <ChangeServiceDialog
        open={changing}
        onOpenChange={setChanging}
        serviceName={serviceName}
        onDiscard={onDiscard}
      />
    </section>
  );
}
