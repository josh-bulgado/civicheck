import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  lookupRequestsByTrackingFn,
  type CashierLookupResult,
} from "~/features/requests/requests.queries";
import {
  submitPaymentVerification,
  type PaymentVerification,
} from "~/features/requests/verify-payment";
import type { VerifiedPayment } from "./slip-phase";
import { parseTrackingInput } from "./tracking-input";

/** The two things the counter asks of the server, so a test or preview can stand in for them. */
export interface CounterPorts {
  lookup: (trackingNumbers: string[]) => Promise<CashierLookupResult[]>;
  verify: (verification: PaymentVerification) => Promise<boolean>;
}

export const LIVE_PORTS: CounterPorts = {
  lookup: (trackingNumbers) => lookupRequestsByTrackingFn({ data: { trackingNumbers } }),
  verify: submitPaymentVerification,
};

type Payment = { free: false; orNumber: string } | { free: true; confirmNoFee: boolean };

interface Options {
  /** A tracking number to look up as soon as the counter opens, e.g. from a notification. */
  initialTracking?: string;
  /** Runs after a payment is recorded, so the page can refresh what it shows around the slip. */
  onVerified?: () => void;
  ports?: CounterPorts;
}

/**
 * What the cashier has in front of them: the tracking field, the request it
 * found, and the payment they have just recorded. A lookup runs the moment the
 * field holds a whole number, and a slower earlier lookup never overwrites a
 * newer one.
 */
export function useCashierCounter({ initialTracking, onVerified, ports = LIVE_PORTS }: Options = {}) {
  const [raw, setRaw] = useState(initialTracking ?? "");
  const [results, setResults] = useState<CashierLookupResult[] | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedPayment | null>(null);
  const [searching, setSearching] = useState(false);
  const [recording, setRecording] = useState(false);
  const latestLookup = useRef(0);

  const find = useCallback(
    async (candidates: string[], justVerified: VerifiedPayment | null = null) => {
      const ticket = ++latestLookup.current;
      setSearching(true);
      try {
        const found = await ports.lookup(candidates);
        if (ticket !== latestLookup.current) return;
        setResults(found);
        setPickedId(null);
        setVerified(justVerified);
      } catch (err) {
        if (ticket !== latestLookup.current) return;
        toast.error("Could not look up that tracking number", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        if (ticket === latestLookup.current) setSearching(false);
      }
    },
    [ports],
  );

  const startOver = useCallback((nextRaw: string) => {
    latestLookup.current++;
    setRaw(nextRaw);
    setResults(null);
    setPickedId(null);
    setVerified(null);
    setSearching(false);
  }, []);

  const changeRaw = useCallback(
    (next: string) => {
      const query = parseTrackingInput(next);
      if (query.kind === "incomplete") {
        startOver(next);
        return;
      }
      setRaw(next);
      void find(query.candidates);
    },
    [find, startOver],
  );

  /** Looks up a whole tracking number, as from the tape or the scanner. */
  const open = useCallback(
    (trackingNumber: string) => {
      setRaw(trackingNumber);
      const query = parseTrackingInput(trackingNumber);
      if (query.kind === "incomplete") startOver(trackingNumber);
      else void find(query.candidates);
    },
    [find, startOver],
  );

  const clear = useCallback(() => startOver(""), [startOver]);

  // Arriving from a notification: look the request up straight away.
  useEffect(() => {
    if (!initialTracking) return;
    const query = parseTrackingInput(initialTracking);
    if (query.kind === "incomplete") return;
    setRaw(initialTracking);
    void find(query.candidates);
  }, [initialTracking, find]);

  const result =
    results?.length === 1 ? results[0] : (results?.find((r) => r.id === pickedId) ?? null);

  const record = useCallback(
    async (payment: Payment) => {
      if (!result) return;
      setRecording(true);
      try {
        const recorded = await ports.verify({ requestId: result.id, ...payment });
        if (!recorded) return;
        await find([result.trackingNumber], {
          free: payment.free,
          orNumber: payment.free ? "" : payment.orNumber.trim(),
        });
        onVerified?.();
      } finally {
        setRecording(false);
      }
    },
    [result, ports, find, onVerified],
  );

  return {
    raw,
    changeRaw,
    open,
    clear,
    record,
    pick: setPickedId,
    result,
    /** Two requests share the typed digits across years; the cashier picks which. */
    choices: results && results.length > 1 && !result ? results : null,
    missing: results !== null && results.length === 0,
    verified,
    searching,
    recording,
  };
}
