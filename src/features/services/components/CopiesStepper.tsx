import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  WIZARD_CONTROL_CLASS,
  WIZARD_LABEL_CLASS,
} from "~/features/forms/components/wizard-field";
import { cn } from "~/lib/utils";
import {
  clampCopies,
  formatPesoFee,
  MAX_COPIES,
} from "~/features/services/service-utils";

interface CopiesStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Fee for one copy; drives the running total shown beside the stepper. */
  unitFee: number | string;
  disabled?: boolean;
  /** Match the applicant wizard's field styling (label, input height and font). */
  wizard?: boolean;
}

/**
 * Quantity picker for per-copy services: `[−] 2 [+]`, 1 to `MAX_COPIES`.
 * The field also accepts typing, so it keeps its own text while the applicant
 * edits (an empty box mid-edit shouldn't snap to 1) and clamps on blur.
 */
export function CopiesStepper({
  value,
  onChange,
  unitFee,
  disabled = false,
  wizard = false,
}: CopiesStepperProps) {
  const labelId = useId();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(next: number) {
    const clamped = clampCopies(next);
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  const total = Number(unitFee) * value;

  return (
    <div className="flex flex-col gap-2">
      <span
        id={labelId}
        className={wizard ? WIZARD_LABEL_CLASS : "text-sm font-medium text-foreground"}
      >
        Number of copies
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-labelledby={labelId} className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={wizard ? "size-14 rounded-[14px]" : undefined}
            aria-label="Decrease number of copies"
            disabled={disabled || value <= 1}
            onClick={() => commit(value - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Input
            inputMode="numeric"
            autoComplete="off"
            aria-label="Number of copies"
            className={cn(
              "w-14 text-center tabular-nums",
              wizard && cn(WIZARD_CONTROL_CLASS, "w-20 px-2 text-center"),
            )}
            value={text}
            disabled={disabled}
            onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={() => commit(text === "" ? 1 : Number(text))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit(text === "" ? 1 : Number(text));
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={wizard ? "size-14 rounded-[14px]" : undefined}
            aria-label="Increase number of copies"
            disabled={disabled || value >= MAX_COPIES}
            onClick={() => commit(value + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-sm text-muted-foreground tabular-nums",
            wizard && "text-[15px]",
          )}
        >
          {formatPesoFee(unitFee)} per copy
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          <span className="font-semibold text-foreground">
            Total {formatPesoFee(total)}
          </span>
        </p>
      </div>
      <p className={cn("text-xs text-muted-foreground", wizard && "text-sm")}>
        Up to {MAX_COPIES} copies per request. The fee is paid at the cashier.
      </p>
    </div>
  );
}
