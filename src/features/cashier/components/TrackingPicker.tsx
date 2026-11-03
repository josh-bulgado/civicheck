import { useEffect, useRef } from "react";
import { Kbd } from "~/components/ui/kbd";
import type { CashierLookupResult } from "~/features/requests/requests.queries";

interface TrackingPickerProps {
  /** Requests that share the typed digits, newest year first. */
  choices: CashierLookupResult[];
  onPick: (id: string) => void;
}

/**
 * Two requests can end in the same 6 digits when their numbers were issued in
 * different years. The cashier is shown both and confirms the right one with
 * the applicant, so a payment is never recorded against the wrong person.
 */
export function TrackingPicker({ choices, onPick }: TrackingPickerProps) {
  const digits = choices[0]?.trackingNumber.slice(-6);
  const firstRef = useRef<HTMLButtonElement>(null);

  // Focus leaves the tracking field so 1 and 2 pick, and Enter takes the newest.
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  return (
    <section
      aria-label="Choose a request"
      className="mx-auto flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border-strong bg-card p-4"
    >
      <div>
        <h2 className="text-base font-semibold">Two Requests End in {digits}</h2>
        <p className="text-sm text-muted-foreground">
          They were filed in different years. Ask the applicant for their name.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {choices.map((choice, index) => (
          <li key={choice.id}>
            <button
              ref={index === 0 ? firstRef : undefined}
              type="button"
              onClick={() => onPick(choice.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Kbd aria-hidden="true">{index + 1}</Kbd>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-mono text-sm">{choice.trackingNumber}</span>
                <span className="truncate text-base font-semibold">{choice.applicantName}</span>
                <span className="truncate text-sm text-muted-foreground">{choice.serviceName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
