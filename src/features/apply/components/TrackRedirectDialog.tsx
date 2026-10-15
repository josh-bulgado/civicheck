import { useRef } from "react";
import { CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";

interface TrackRedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applicant-facing copy, authored per service in the admin editor. */
  title: string;
  description: string;
  onKeepEditing: () => void;
  onSwitch: () => void;
  /**
   * Where focus lands when the dialog closes, however it closes: the date field
   * that raised it, so the person is back where they were.
   */
  returnFocusTo?: () => HTMLElement | null;
}

/**
 * Asks before moving an application to the other registration track. The
 * On-Time/Delayed decision is data-driven (`eventTiming` on the published form
 * template), so the words come in as props; what is fixed here is the shape.
 * A misclicked date must not force an unwanted redirect, which is why it asks.
 *
 * It is guidance, not an error, so it is calm: a plain white panel, a blue
 * glyph, two equal buttons and no X (the buttons, Escape and a click outside
 * are the ways out). Focus starts on "Switch track", so Enter answers yes only
 * when that is where the person already is.
 */
export function TrackRedirectDialog({
  open,
  onOpenChange,
  title,
  description,
  onKeepEditing,
  onSwitch,
  returnFocusTo,
}: TrackRedirectDialogProps) {
  const switchButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={switchButton}
        finalFocus={returnFocusTo}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm duration-150 motion-reduce:duration-0"
        className="apply-wizard w-[min(32.5rem,calc(100%-1.5rem))] max-w-none gap-0 rounded-[28px] bg-white p-8 pb-7 shadow-portal-dialog ring-0 duration-150 sm:max-w-none data-open:zoom-in-100 data-open:slide-in-from-bottom-2 data-closed:zoom-out-100 data-closed:slide-out-to-bottom-2 motion-reduce:duration-0 motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none"
      >
        <span
          className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <CalendarClock className="size-5" />
        </span>

        <DialogTitle className="mt-4.5 font-sans text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2.5 text-base leading-normal text-body-2">
          {description} Everything you&rsquo;ve entered carries over.
        </DialogDescription>

        {/* Same size and weight: neither answer is the louder one. */}
        <div className="mt-7 flex gap-2.5">
          <button
            type="button"
            onClick={onKeepEditing}
            className="civic-press h-13 min-w-0 flex-1 rounded-full border border-[#d7dee9] bg-white px-4 text-base font-semibold whitespace-nowrap text-foreground transition-colors hover:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            Fix the date
          </button>
          <button
            ref={switchButton}
            type="button"
            onClick={onSwitch}
            className="civic-press h-13 min-w-0 flex-1 rounded-full border border-primary bg-primary px-4 text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-primary-hover focus:ring-4 focus:ring-primary/20 focus:outline-none"
          >
            Switch track
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
