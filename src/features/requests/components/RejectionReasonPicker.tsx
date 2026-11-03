import { useCallback, useState } from "react";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";

/** Radio value for the "write your own" choice; can't collide with a reason. */
const OTHER = "__other__";

/**
 * Selection state for a rejection reason: either one of the predefined
 * reasons or a custom one typed under "Other". `reason` is the resolved,
 * trimmed string to send to the server — empty until a valid choice is made.
 */
export function useRejectionReason() {
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");

  const reason = choice === OTHER ? other.trim() : choice;
  const reset = useCallback(() => {
    setChoice("");
    setOther("");
  }, []);

  return { choice, setChoice, other, setOther, reason, reset };
}

export type RejectionReasonState = ReturnType<typeof useRejectionReason>;

interface RejectionReasonPickerProps {
  /** Unique per instance — prefixes the ids that tie labels to controls. */
  idPrefix: string;
  legend: string;
  reasons: readonly string[];
  state: RejectionReasonState;
  disabled?: boolean;
}

export function RejectionReasonPicker({
  idPrefix,
  legend,
  reasons,
  state,
  disabled,
}: RejectionReasonPickerProps) {
  const legendId = `${idPrefix}-legend`;
  const otherTextId = `${idPrefix}-other-text`;

  return (
    <div className="flex flex-col gap-2">
      <p id={legendId} className="text-sm leading-none font-medium">
        {legend}
      </p>
      <RadioGroup
        aria-labelledby={legendId}
        value={state.choice}
        onValueChange={(value) => state.setChoice(String(value))}
        disabled={disabled}
        className="gap-2"
      >
        {reasons.map((reason, index) => (
          <ReasonOption
            key={reason}
            id={`${idPrefix}-${index}`}
            value={reason}
            label={reason}
          />
        ))}
        <ReasonOption
          id={`${idPrefix}-other`}
          value={OTHER}
          label="Other (write your own)"
        />
      </RadioGroup>

      {state.choice === OTHER && (
        <div className="civic-enter-sm flex flex-col gap-2">
          <Label htmlFor={otherTextId} className="sr-only">
            Describe the reason
          </Label>
          <Textarea
            id={otherTextId}
            rows={2}
            autoFocus
            disabled={disabled}
            value={state.other}
            onChange={(e) => state.setOther(e.target.value)}
            placeholder="What's wrong, so the applicant can fix it?"
          />
        </div>
      )}
    </div>
  );
}

function ReasonOption({
  id,
  value,
  label,
}: {
  id: string;
  value: string;
  label: string;
}) {
  return (
    // The whole row is the label, so the tap target is the full width.
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-light bg-background p-3 font-normal has-data-checked:border-primary has-data-checked:bg-primary/5"
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="text-sm leading-snug text-foreground">{label}</span>
    </Label>
  );
}
