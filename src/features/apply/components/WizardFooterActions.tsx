import { cn } from "~/lib/utils";
import { WizardSpinner } from "~/features/apply/components/wizard-feedback";

interface WizardFooterActionsProps {
  onBack?: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continuePending?: boolean;
  /** What the button says while it works: "Saving…" by default, "Submitting…" on the last step. */
  pendingLabel?: string;
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
  pendingLabel = "Saving…",
  continueReady = true,
  note,
}: WizardFooterActionsProps) {
  const quiet = !continueReady || continueDisabled || continuePending;

  return (
    <div className="mt-7.5 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border-light pt-6.5 sm:flex-row sm:items-center sm:gap-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="civic-press h-13.5 rounded-xl border border-border bg-card px-7 text-base font-semibold text-foreground transition-colors hover:bg-primary-tint"
        >
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center sm:gap-5">
        {note && (
          <p className="text-center text-[15px] text-muted-foreground sm:text-right" aria-live="polite">
            {note}
          </p>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || continuePending}
          aria-busy={continuePending || undefined}
          // Not ready reads the same as disabled, but stays clickable so a press
          // surfaces which required fields are still empty.
          className={cn(
            "civic-press inline-flex h-13.5 items-center justify-center gap-2.5 rounded-xl border px-8 text-base font-semibold transition-colors",
            quiet
              ? "border-border-light bg-[#eef1f6] dark:bg-muted text-[#7a8696] dark:text-muted-foreground disabled:cursor-default"
              : "border-primary-fill bg-primary-fill text-white shadow-[0_8px_20px_rgba(11,77,162,0.25)] hover:bg-primary-fill-hover",
          )}
        >
          {/* A spinner beside the label makes the wait legible as work in
              progress rather than a button that simply stopped responding. */}
          {continuePending && <WizardSpinner />}
          {continuePending ? pendingLabel : continueLabel}
        </button>
      </div>
    </div>
  );
}
