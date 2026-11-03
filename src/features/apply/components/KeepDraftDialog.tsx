import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

// ─── Leaving a draft ─────────────────────────────────────────────────────────
// Every way out of the wizard that the applicant picks with a button asks this
// one question. The trigger says what it does ("Change service", the CiviCheck
// mark), never "Cancel": in a wizard "Cancel" reads as "throw my application
// away". The one question is what happens to the draft.

const DIALOG_PANEL =
  "w-[min(33.75rem,calc(100%-2rem))] max-w-none gap-0 overflow-hidden rounded-[28px] bg-card p-8 pb-7 shadow-portal-dialog ring-0 sm:max-w-none max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:px-6";

const PILL_BASE =
  "civic-press inline-flex h-13.5 min-w-0 flex-1 items-center justify-center rounded-full px-4 text-base font-semibold whitespace-nowrap";

export function KeepDraftDialog({
  open,
  onOpenChange,
  serviceName,
  destination,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  /** Where the applicant goes once they have chosen. */
  destination: "/services" | "/dashboard";
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
    void navigate({ to: destination });
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
            {destination === "/services" ? (
              <p className="flex items-start gap-2 text-[15px] leading-snug text-muted-foreground">
                <Info className="mt-0.5 size-4.25 shrink-0" aria-hidden="true" />
                Uploaded documents do not transfer between services.
              </p>
            ) : null}
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
