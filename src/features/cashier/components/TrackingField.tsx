import type { KeyboardEventHandler, Ref } from "react";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { isDigitsMode } from "../tracking-input";

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
      <div className="flex h-16 items-center gap-1.5 rounded-xl border border-border-strong bg-card px-4 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {digitsMode ? (
          <span aria-hidden="true" className="font-mono text-xl text-muted-foreground select-none">
            CCRO-{year}-
          </span>
        ) : null}
        <input
          id="tracking-number"
          ref={inputRef}
          name="tracking-number"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={digitsMode ? "000000" : undefined}
          aria-describedby={HELP_ID}
          aria-busy={busy}
          className="min-w-0 flex-1 bg-transparent font-mono text-3xl font-semibold tracking-[0.08em] outline-none placeholder:text-muted-foreground/50"
        />
        <Kbd aria-hidden="true">{hotkeyLabel}</Kbd>
      </div>
      <p id={HELP_ID} className="sr-only">
        Type the last 6 digits, or scan or paste the whole number. The lookup runs on its own.
      </p>
    </div>
  );
}
