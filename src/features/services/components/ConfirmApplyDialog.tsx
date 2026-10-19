import { useRef } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatPesoFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

interface ConfirmApplyDialogProps {
  /** Service display name, as shown on the card. */
  title: string;
  fee: number | string;
  displayGroup: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Reopens the checklist, for someone who would rather read it first. */
  onCheckRequirements?: () => void;
}

// What the application will ask of them, in the order it asks.
const STEPS = ["Fill in details", "Upload documents", "Get tracking number", "Bring originals"];

/**
 * Asks the applicant to confirm before the apply flow takes over the page.
 * Nothing is filed at this point — submission happens at the review step — so
 * the dialog says so rather than implying the request goes in now.
 *
 * Focus starts on "Not yet": Enter never applies by accident.
 */
export function ConfirmApplyDialog({
  title,
  fee,
  displayGroup,
  open,
  onOpenChange,
  onConfirm,
  onCheckRequirements,
}: ConfirmApplyDialogProps) {
  const notYet = useRef<HTMLButtonElement>(null);
  const feeLabel = formatPesoFee(fee, displayGroup);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={notYet}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
        className="w-[min(35rem,calc(100%-2rem))] max-w-none gap-0 overflow-hidden rounded-[28px] bg-card p-0 shadow-portal-dialog ring-0 sm:max-w-none"
      >
        <header className="relative bg-(image:--portal-hero) px-6 pt-7.5 pr-18 pb-7 sm:px-8">
          <DialogTitle className="font-sans text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-foreground sm:text-[30px]">
            Apply for this document?
          </DialogTitle>
          {/* The service on its own line: what is being asked about, nothing else. */}
          <DialogDescription className="mt-2 text-lg leading-snug font-semibold text-portal-ink-2">
            {title}
          </DialogDescription>
          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close"
                className="civic-press absolute top-4.5 right-4.5 flex size-10 items-center justify-center rounded-full bg-card/70 text-foreground hover:bg-card"
              />
            }
          >
            <X className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
          </DialogClose>
        </header>

        <div className="px-6 pt-6.5 pb-7 sm:px-8">
          <div className="flex items-center justify-between gap-4 rounded-[18px] bg-portal-panel px-5.5 py-4">
            <span className="text-base font-semibold text-body-2">Fee at cashier</span>
            <span
              className={cn(
                "text-[32px] leading-none font-bold",
                feeLabel === "Free" ? "text-tone-success" : "text-foreground",
              )}
            >
              {feeLabel}
            </span>
          </div>

          {/* One line runs through the four numbers, from the first to the last. */}
          <ol className="relative mt-6.5 grid grid-cols-4">
            <span
              className="absolute top-4.25 right-[12.5%] left-[12.5%] h-0.5 bg-[#cfd8e8] dark:bg-border-strong"
              aria-hidden="true"
            />
            {STEPS.map((step, index) => (
              <li key={step} className="relative flex flex-col items-center px-1 text-center">
                <span className="flex size-8.5 items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-primary">
                  {index + 1}
                </span>
                <span className="mt-3 text-[15px] leading-snug font-semibold text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-6 flex items-center justify-center gap-2.5 text-[15px] text-body-2">
            <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            Nothing is filed until you submit.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border-lighter pt-5.5">
            {onCheckRequirements ? (
              <button
                type="button"
                onClick={onCheckRequirements}
                className="civic-press rounded-full py-2 text-[15px] font-semibold text-primary hover:text-primary-hover"
              >
                Check requirements first
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button
                ref={notYet}
                type="button"
                onClick={() => onOpenChange(false)}
                className="civic-press h-13 rounded-full border border-border bg-card px-6.5 text-base font-semibold text-foreground hover:bg-primary-tint"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="civic-press inline-flex h-13 items-center gap-2.5 rounded-full bg-primary-fill px-6.5 text-base font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(11,77,162,0.28)] hover:bg-primary-fill-hover"
              >
                Yes, apply
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
