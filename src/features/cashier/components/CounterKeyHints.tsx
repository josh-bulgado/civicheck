import { Kbd } from "~/components/ui/kbd";

export interface KeyHint {
  keys: string;
  label: string;
}

/** The keys the counter answers to, always on screen so a new cashier learns them by looking. */
export function CounterKeyHints({ hints }: { hints: KeyHint[] }) {
  return (
    <ul
      aria-label="Keyboard shortcuts"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
    >
      {hints.map((hint) => (
        <li key={hint.label} className="inline-flex items-center gap-2">
          <Kbd aria-hidden="true">{hint.keys}</Kbd>
          {hint.label}
        </li>
      ))}
    </ul>
  );
}
