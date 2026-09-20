import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface TrackRedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applicant-facing copy, authored per service in the admin editor. */
  title: string;
  description: string;
  ctaLabel: string;
  onKeepEditing: () => void;
  onSwitch: () => void;
}

/**
 * Generic confirmation for a cross-service registration-track redirect. The
 * On-Time/Delayed decision is data-driven (`eventTiming` on the published form
 * template), so this dialog only renders the admin-authored copy and confirms
 * before switching — a misclicked date must not force an unwanted redirect.
 */
export function TrackRedirectDialog({
  open,
  onOpenChange,
  title,
  description,
  ctaLabel,
  onKeepEditing,
  onSwitch,
}: TrackRedirectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} Everything you&rsquo;ve entered so far will carry
            over.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onKeepEditing}>
            Let me fix the date
          </Button>
          <Button type="button" onClick={onSwitch}>
            {ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
