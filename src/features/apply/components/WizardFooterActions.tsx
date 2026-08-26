import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

interface WizardFooterActionsProps {
  onBack?: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continuePending?: boolean;
  note?: string;
}

export function WizardFooterActions({
  onBack,
  onContinue,
  backLabel = "Back",
  continueLabel = "Continue",
  continueDisabled,
  continuePending,
  note,
}: WizardFooterActionsProps) {
  return (
    <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border-light pt-6 sm:flex-row sm:items-center sm:gap-4">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
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
