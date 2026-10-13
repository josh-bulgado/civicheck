import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

interface WizardFooterActionsProps {
  onBack?: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continuePending?: boolean;
  /**
   * False while required answers are still missing: the button drops its blue
   * fill but stays pressable, so pressing it shows what is left to fill in.
   */
  continueReady?: boolean;
  note?: string;
}

export function WizardFooterActions({
  onBack,
  onContinue,
  backLabel = "Back",
  continueLabel = "Continue",
  continueDisabled,
  continuePending,
  continueReady = true,
  note,
}: WizardFooterActionsProps) {
  return (
    <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:gap-4">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-lg px-4 text-[15px] font-semibold"
          onClick={onBack}
        >
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center sm:gap-4">
        {note && (
          <p
            className="text-center text-sm text-muted-foreground sm:text-right"
            aria-live="polite"
          >
            {note}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          // Disabled reads as a gray control with legible text (4.7:1), not the
          // primary fill faded to 50%, which left white text on pale blue.
          className={cn(
            "rounded-lg px-4 text-[15px] font-semibold hover:bg-primary-hover disabled:border-border disabled:bg-muted disabled:text-muted-2 disabled:opacity-100",
            // Not ready reads the same as disabled, but stays clickable so a
            // press surfaces which required fields are still empty.
            !continueReady &&
              "border-border bg-muted text-muted-2 hover:bg-muted",
          )}
          onClick={onContinue}
          disabled={continueDisabled || continuePending}
        >
          {/* A spinner alongside the label makes the wait legible as work in
              progress rather than a button that simply stopped responding. */}
          {continuePending && <Spinner aria-hidden="true" />}
          {continuePending ? "Saving…" : continueLabel}
        </Button>
      </div>
    </div>
  );
}
