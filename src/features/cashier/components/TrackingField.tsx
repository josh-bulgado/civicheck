import type { KeyboardEventHandler, Ref } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { acceptTrackingInput, isDigitsMode } from "../tracking-input";

interface TrackingFieldProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  /** The year drawn in front of bare digits: this year, or the year of the request just found. */
  year: number;
  /** How to focus the field by key, shown as a hint. */
  hotkeyLabel: string;
  busy?: boolean;
}

const HELP_ID = "tracking-number-help";

/**
 * The tracking number, typed as just its 6 digits behind a drawn `CCRO-<year>-`
 * prefix. A whole number typed, pasted or scanned works too, and then the
 * prefix steps aside because the field already holds it.
 */
export function TrackingField({
  value,
  onChange,
  onKeyDown,
  inputRef,
  year,
  hotkeyLabel,
  busy,
}: TrackingFieldProps) {
  const digitsMode = isDigitsMode(value);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Label htmlFor="tracking-number" className="text-sm font-semibold">
        Tracking Number
      </Label>
      <InputGroup className="h-16 rounded-xl border-border-strong bg-card">
        {digitsMode ? (
          <InputGroupAddon className="pl-4">
            <InputGroupText aria-hidden="true" className="font-mono text-xl">
              CCRO-{year}-
            </InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          id="tracking-number"
          ref={inputRef}
          name="tracking-number"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          value={value}
          onChange={(event) => onChange(acceptTrackingInput(event.target.value, value))}
          onKeyDown={onKeyDown}
          placeholder={digitsMode ? "000000" : undefined}
          aria-describedby={HELP_ID}
          aria-busy={busy}
          className={cn(
            "h-full font-mono text-3xl font-semibold tracking-[0.08em] placeholder:text-muted-foreground/50 md:text-3xl",
            digitsMode ? "pl-1.5" : "pl-4",
          )}
        />
        <InputGroupAddon align="inline-end" className="pr-4">
          <Kbd aria-hidden="true">{hotkeyLabel}</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <p id={HELP_ID} className="sr-only">
        Type the last 6 digits, or scan or paste the whole number. The lookup runs on its own.
      </p>
    </div>
  );
}
