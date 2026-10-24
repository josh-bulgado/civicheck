import { useEffect, useRef, useState, type FormEvent, type Ref } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { formatPeso } from "~/lib/peso";
import type { CashierLookupResult } from "~/features/requests/requests.queries";
import { getPaymentDetails, getStatusDetails } from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";
import { getSlipPhase, isTakingPayment, type VerifiedPayment } from "../slip-phase";

interface CounterSlipProps {
  result: CashierLookupResult;
  verified: VerifiedPayment | null;
  recording: boolean;
  onRecord: (payment: { free: false; orNumber: string } | { free: true; confirmNoFee: boolean }) => void;
  onNext: () => void;
  onClear: () => void;
  formRef: Ref<HTMLFormElement>;
  receiptRef: Ref<HTMLInputElement>;
  /** How to submit by key, shown as a hint. */
  submitHint: string;
  nextHint: string;
  clearHint: string;
}

/**
 * The request in front of the cashier, drawn as the counter slip: who, what,
 * what is owed, and then the one thing to write on it. The outcome is stamped
 * on the slip (Verified, Paid, Not Ready), so the state reads from across the
 * desk. The slip is remounted for each request, which clears the receipt field.
 */
export function CounterSlip({
  result,
  verified,
  recording,
  onRecord,
  onNext,
  onClear,
  formRef,
  receiptRef,
  submitHint,
  nextHint,
  clearHint,
}: CounterSlipProps) {
  const [receipt, setReceipt] = useState("");
  const [noFee, setNoFee] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextRef = useRef<HTMLButtonElement>(null);
  const noFeeRef = useRef<HTMLSpanElement>(null);

  const phase = getSlipPhase(result, verified);
  const taking = isTakingPayment(phase);

  // Put the cursor where the next keystroke belongs: the tick for a fee-free
  // request, and once there is nothing left to write, the button that moves on.
  useEffect(() => {
    if (phase === "confirm-free") noFeeRef.current?.focus();
    else if (!taking) nextRef.current?.focus();
  }, [phase, taking]);
  const free = phase === "confirm-free";

  const status = getStatusDetails(result.status);
  const payment = getPaymentDetails(result.paymentStatus, result.feesDue);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taking || recording) return;

    const missing = free ? !noFee : receipt.trim().length === 0;
    if (missing) {
      setError(
        free
          ? "Tick the box to confirm that no fee is due."
          : "Enter the official receipt number.",
      );
      event.currentTarget
        .querySelector<HTMLElement>(free ? "#no-fee-confirmed" : "#receipt-number")
        ?.focus();
      return;
    }
    onRecord(free ? { free: true, confirmNoFee: noFee } : { free: false, orNumber: receipt.trim() });
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      aria-label="Counter slip"
      className="mx-auto flex w-full max-w-lg flex-col gap-7"
    >
      <article className="counter-slip px-8 pt-6 pb-7">
        <header className="border-b-2 border-dashed border-border-strong pb-4 text-center">
          <p className="font-mono text-xs font-semibold tracking-[0.18em] uppercase">
            City Civil Registrar Office
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">City Government of Legazpi</p>
        </header>

        <dl className="flex flex-col gap-2.5 pt-3.5">
          <SlipRow label="Tracking">
            <span className="font-mono text-[15px]">{result.trackingNumber}</span>
          </SlipRow>
          <SlipRow label="Applicant">{result.applicantName}</SlipRow>
          <SlipRow label="Service">
            <span className="text-sm font-medium text-pretty">{result.serviceName}</span>
          </SlipRow>
          <SlipRow label="Status">
            <span className="flex flex-wrap justify-end gap-1.5">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={payment.variant}>{payment.label}</Badge>
            </span>
          </SlipRow>
        </dl>

        <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-dashed border-border-strong pt-3.5">
          <span className="font-mono text-xs font-semibold tracking-[0.18em]">FEE DUE</span>
          <span className="font-mono text-4xl leading-none font-semibold tracking-tighter tabular-nums">
            {formatPeso(result.feesDue)}
          </span>
        </div>

        <section
          className={cn(
            "relative mt-4 border-t-2 border-dashed border-border-strong pt-3.5",
            // Room for the stamp, which is taller than the line of text beside it.
            !taking && "min-h-28",
          )}
        >
          {phase === "collect" ? (
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="receipt-number" className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                OR No.
              </Label>
              <input
                id="receipt-number"
                ref={receiptRef}
                name="receipt-number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                value={receipt}
                onChange={(event) => {
                  setReceipt(event.target.value);
                  setError(null);
                }}
                placeholder="000123"
                aria-invalid={error ? true : undefined}
                aria-describedby="slip-hint"
                className="counter-slip-input"
              />
              <SlipHint id="slip-hint" error={error}>
                Enter records the payment.
              </SlipHint>
            </div>
          ) : null}

          {phase === "confirm-free" ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="no-fee-confirmed"
                  ref={noFeeRef}
                  checked={noFee}
                  onCheckedChange={(checked) => {
                    setNoFee(checked === true);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby="slip-hint"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.closest("form")?.requestSubmit();
                    }
                  }}
                  className="size-6"
                />
                <Label htmlFor="no-fee-confirmed" className="text-[15px] leading-snug font-semibold">
                  Confirm that no fee is due for this request
                </Label>
              </div>
              <SlipHint id="slip-hint" error={error}>
                Space ticks the box. Enter confirms.
              </SlipHint>
            </div>
          ) : null}

          {phase === "not-ready" ? (
            <>
              <Stamp tone="warning">Not Ready</Stamp>
              <p className="max-w-[48%] text-sm text-pretty text-muted-foreground">
                Payment can&rsquo;t be collected yet. This request is still{" "}
                {status.label.toLowerCase()} and needs to be marked ready for release first.
              </p>
            </>
          ) : null}

          {phase === "settled" ? (
            <>
              <Stamp tone="success" caption={result.orNumber ? `OR ${result.orNumber}` : undefined}>
                {result.feesDue > 0 ? "Paid" : "No Fee"}
              </Stamp>
              <p className="max-w-[48%] text-sm text-pretty text-muted-foreground">
                {result.feesDue > 0
                  ? "Payment was verified earlier. Nothing to collect."
                  : "No fee was due. This request is cleared for release."}
              </p>
            </>
          ) : null}

          {phase === "just-verified" && verified ? (
            <>
              <Stamp tone="success" caption={verified.free ? undefined : `OR ${verified.orNumber}`}>
                {verified.free ? "Cleared" : "Verified"}
              </Stamp>
              <p className="max-w-[48%] text-sm text-pretty text-muted-foreground">
                {verified.free
                  ? "Fee-free request confirmed."
                  : `${formatPeso(result.feesDue)} recorded.`}{" "}
                The applicant claims the document at the release window.
              </p>
            </>
          ) : null}
        </section>
      </article>

      <div className="sticky bottom-3 z-10 flex gap-3">
        {taking ? (
          <>
            <Button type="button" variant="outline" size="xl" onClick={onClear}>
              Clear
              <Kbd aria-hidden="true">{clearHint}</Kbd>
            </Button>
            <Button type="submit" variant="raised" size="xl" className="flex-1" disabled={recording}>
              {free ? "Confirm Fee-Free Request" : "Verify Payment"}
              <Kbd aria-hidden="true" className="bg-primary-foreground/20 text-primary-foreground">
                {submitHint}
              </Kbd>
            </Button>
          </>
        ) : (
          <Button
            ref={nextRef}
            type="button"
            variant="raised"
            size="xl"
            className="flex-1"
            onClick={onNext}
          >
            Next Applicant
            <Kbd aria-hidden="true" className="bg-primary-foreground/20 text-primary-foreground">
              {nextHint}
            </Kbd>
          </Button>
        )}
      </div>
    </form>
  );
}

/** The line under the field: what the key does, or what is missing. */
function SlipHint({
  id,
  error,
  children,
}: {
  id: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return error ? (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {error}
    </p>
  ) : (
    <p id={id} className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SlipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="pt-1 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-right text-base leading-snug font-semibold">{children}</dd>
    </div>
  );
}

function Stamp({
  tone,
  caption,
  children,
}: {
  tone: "success" | "warning";
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "counter-stamp flex flex-col items-center gap-1.5",
        tone === "success" ? "text-tone-success" : "text-tone-warning",
      )}
    >
      <span>{children}</span>
      {caption ? <span className="text-xs font-semibold tracking-[0.14em]">{caption}</span> : null}
    </div>
  );
}
