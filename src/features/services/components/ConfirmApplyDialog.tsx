import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatFee } from "~/features/services/service-utils";

interface ConfirmApplyDialogProps {
  /** Service display name, as shown on the card. */
  title: string;
  fee: number | string;
  displayGroup: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Asks the applicant to confirm before the apply flow takes over the page.
 * Nothing is filed at this point — submission happens at the review step — so
 * the copy says so rather than implying the request goes in now.
 */
export function ConfirmApplyDialog({
  title,
  fee,
  displayGroup,
  open,
  onOpenChange,
  onConfirm,
}: ConfirmApplyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for this document?</DialogTitle>
          <DialogDescription>
            You're about to start a request for{" "}
            <span className="font-semibold text-foreground">{title}</span> at
            the City Civil Registrar Office.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border-light bg-surface-subtle px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm text-body">
              <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
              Fee at cashier
            </span>
            <span className="text-base font-bold text-foreground">
              {formatFee(fee, displayGroup)}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-body">
            You'll fill in the subject's details, confirm your requirements, and
            get a tracking number once you submit. Nothing is filed yet — you
            can review everything on the last step, and your progress is saved
            if you step away.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button type="button" onClick={onConfirm}>
            Yes, apply
            <ArrowRight aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
