import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FilePenLine } from "lucide-react";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatFee, formatPesoFee, totalFee } from "~/features/services/service-utils";

interface ChangeServiceButtonProps {
  serviceName: string;
  onDiscard?: () => void;
  label?: string;
}

export function ChangeServiceButton({
  serviceName,
  onDiscard,
  label = "Change service",
}: ChangeServiceButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        aria-label={label}
        className="text-[15px] font-semibold hover:text-primary-hover"
        onClick={() => setOpen(true)}
      >
        <FilePenLine data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Change</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a different service?</DialogTitle>
            <DialogDescription>
              You are currently applying for{" "}
              <span className="font-semibold text-foreground">
                {serviceName}
              </span>
              . You can keep this draft on this device while you browse, or
              discard it before choosing another service. Uploaded documents
              do not transfer between services.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Keep this service
            </DialogClose>
            {onDiscard ? (
              <Link
                to="/services"
                onClick={onDiscard}
                className={buttonVariants({ variant: "destructive" })}
              >
                Discard draft
              </Link>
            ) : null}
            <Link to="/services" className={buttonVariants()}>
              Browse services
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ApplicationDocketProps {
  serviceName: string;
  serviceFamily?: string;
  fee?: number | string;
  /** Quantity and whether `fee` is per copy — together they set the total shown. */
  copies?: number;
  feePerCopy?: boolean;
  selectionPending: boolean;
  onDiscard: () => void;
}

export function ApplicationDocket({
  serviceName,
  serviceFamily,
  fee,
  copies = 1,
  feePerCopy = false,
  selectionPending,
  onDiscard,
}: ApplicationDocketProps) {
  const showBreakdown = feePerCopy && fee !== undefined && copies > 1;
  return (
    <section
      role="region"
      aria-labelledby="selected-service-title"
      className="border-b border-primary/25 bg-primary-soft"
    >
      <div className="mx-auto flex w-full max-w-350 flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Selected service
            </p>
            {/* Whether the service is settled is still tracked and read out by
                assistive tech; it just isn't drawn on screen. */}
            <span className="sr-only">
              {selectionPending ? "Not confirmed" : "Confirmed"}
            </span>
          </div>

          <h2
            id="selected-service-title"
            className="min-w-0 text-pretty text-base font-bold leading-snug text-foreground sm:text-lg"
          >
            {serviceName}
          </h2>

          {selectionPending || serviceFamily ? (
            <p className="mt-0.5 text-pretty text-sm text-muted-foreground">
              {selectionPending
                ? "Answer the questions below to identify the exact service."
                : serviceFamily}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          {fee !== undefined ? (
            <dl className="flex flex-col border-l border-border pl-3.5 leading-tight">
              <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Fee at cashier
              </dt>
              <dd className="mt-0.5 text-[17px] font-bold text-foreground tabular-nums">
                {formatFee(totalFee(fee, copies, feePerCopy))}
              </dd>
              {showBreakdown ? (
                <dd className="text-xs text-muted-foreground tabular-nums">
                  {formatPesoFee(fee)} × {copies} copies
                </dd>
              ) : null}
            </dl>
          ) : null}

          <ChangeServiceButton
            serviceName={serviceName}
            onDiscard={onDiscard}
          />
        </div>
      </div>
    </section>
  );
}
