import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface BirthTrackRedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which direction the entered date implies switching. */
  direction: "toDelayed" | "toOnTime" | null;
  onKeepEditing: () => void;
  onSwitch: () => void;
}

/**
 * On-Time registration only covers births within 30 days; anything older (or,
 * in reverse, a Delayed application for a recent birth) needs the other
 * track. Confirms before switching so a misclicked date doesn't force an
 * unwanted redirect.
 */
export function BirthTrackRedirectDialog({
  open,
  onOpenChange,
  direction,
  onKeepEditing,
  onSwitch,
}: BirthTrackRedirectDialogProps) {
  const toDelayed = direction === "toDelayed";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {toDelayed
              ? "This birth looks more than 30 days old"
              : "This birth looks recent"}
          </DialogTitle>
          <DialogDescription>
            {toDelayed
              ? "On-Time Registration only covers births within the last 30 days. Did you mean a different date, or should we switch you to Delayed Registration instead? Everything you've entered so far will carry over."
              : "This date is within the last 30 days, so On-Time Registration may apply instead of Delayed. Did you mean a different date, or should we switch you? Everything you've entered so far will carry over."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onKeepEditing}>
            Let me fix the date
          </Button>
          <Button type="button" onClick={onSwitch}>
            Switch to {toDelayed ? "Delayed" : "On-Time"} Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
