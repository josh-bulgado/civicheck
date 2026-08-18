import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getPaymentDetails, getStatusDetails } from "~/features/requests/request-workflow";
import { PaymentVerificationPanel } from "~/features/requests/components/PaymentVerificationPanel";
import {
  lookupRequestByTrackingFn,
  type CashierLookupResult,
} from "~/features/requests/requests.queries";

export function CashierCounter() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<CashierLookupResult | null>(null);

  async function handleLookup() {
    const value = trackingNumber.trim();
    if (!value) return;

    setBusy(true);
    try {
      const found = await lookupRequestByTrackingFn({ data: { trackingNumber: value } });
      setResult(found);
      setSearched(true);
    } catch (err) {
      toast.error("Could not look up that tracking number", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  const status = result ? getStatusDetails(result.status) : null;
  const payment = result ? getPaymentDetails(result.paymentStatus) : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Look up a request</h2>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="tracking-number">Tracking number</Label>
            <Input
              id="tracking-number"
              autoFocus
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="CCRO-2026-00001"
            />
          </div>
          <Button type="submit" disabled={busy || !trackingNumber.trim()}>
            <Search className="size-4" />
            Look up
          </Button>
        </form>
      </section>

      {searched && !result && (
        <p className="text-sm italic text-muted-foreground">
          No request found for that tracking number — double-check it with the applicant.
        </p>
      )}

      {result && status && payment && (
        <>
          <section className="rounded-xl border border-border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {result.trackingNumber}
                </p>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  {result.applicantName}
                </h3>
                <p className="text-sm text-muted-foreground">{result.serviceName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${status.styles}`}
                >
                  {status.label}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${payment.styles}`}
                >
                  {payment.label}
                </span>
              </div>
            </div>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
              ₱{result.feesDue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Fee due</p>
          </section>

          <PaymentVerificationPanel
            requestId={result.id}
            feesDue={result.feesDue}
            paymentStatus={result.paymentStatus}
            orNumber={result.orNumber}
            onVerified={handleLookup}
          />
        </>
      )}
    </div>
  );
}
