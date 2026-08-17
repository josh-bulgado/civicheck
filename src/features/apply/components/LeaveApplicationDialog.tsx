import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface LeaveApplicationDialogProps {
  serviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void;
  onDiscard: () => void;
}

/**
 * Shown when the applicant leaves a part-finished application. The draft is
 * already on this device, so "save" is really "keep what's stored" — the choice
 * that matters is whether to throw it away.
 */
export function LeaveApplicationDialog({
  serviceName,
  open,
  onOpenChange,
  onSaveAndExit,
  onDiscard,
}: LeaveApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save your progress before leaving?</DialogTitle>
          <DialogDescription>
            You have an unsubmitted draft for{" "}
            <span className="font-semibold text-foreground">{serviceName}</span>
            . Saving keeps it on this device; discarding clears it. Nothing is
            sent to the CCRO either way.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Keep working
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDiscard}
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            Discard draft
          </Button>
          <Button type="button" onClick={onSaveAndExit}>
            Save and exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
