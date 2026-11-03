import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePermissions } from "~/hooks/usePermissions";
import { submitPaymentVerification } from "~/features/requests/verify-payment";
import { getStatusDetails } from "~/features/requests/request-workflow";

export function PaymentVerificationPanel({
  requestId,
  status,
  feesDue,
  copies = 1,
  paymentStatus,
  orNumber,
  onVerified,
}: {
  requestId: string;
  status: string;
  feesDue: number;
  /** Shown beside the fee so the cashier can see what the total covers. */
  copies?: number;
  paymentStatus: string;
  orNumber: string | null;
  onVerified: () => void;
}) {
  const { can } = usePermissions();
  const canCollect = can("requests:collect_payment");
  const isReadyForRelease = status === "ready_for_release";

  const [value, setValue] = useState("");
  const [noFeeConfirmed, setNoFeeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFree = feesDue <= 0;

  async function handleVerifyPayment() {
    setBusy(true);
    try {
      const recorded = await submitPaymentVerification(
        isFree
          ? { requestId, free: true, confirmNoFee: noFeeConfirmed }
          : { requestId, free: false, orNumber: value },
      );
      if (!recorded) return;
      setValue("");
      setNoFeeConfirmed(false);
      onVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-lg font-bold text-foreground">Payment</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Fee due: ₱{feesDue.toFixed(2)}
        {copies > 1 ? ` · ${copies} copies` : ""}
      </p>

      {paymentStatus === "verified" ? (
        isFree ? (
          <p className="text-sm text-foreground">
            No fee was due — this request is cleared for release.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Verified against OR{" "}
            <span className="font-bold">{orNumber ?? "—"}</span>.
          </p>
        )
      ) : !isReadyForRelease ? (
        <p className="text-sm italic text-muted-foreground">
          Payment can't be collected yet — this request is still{" "}
          {getStatusDetails(status).label.toLowerCase()}. It needs to be marked
          ready for release first.
        </p>
      ) : canCollect && isFree ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="no-fee-confirmed"
              checked={noFeeConfirmed}
              onCheckedChange={(checked) => setNoFeeConfirmed(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="no-fee-confirmed" className="leading-snug">
              Confirm that no fee is due for this request
            </Label>
          </div>
          <Button
            disabled={busy || !noFeeConfirmed}
            onClick={handleVerifyPayment}
          >
            Confirm fee-free request
          </Button>
        </div>
      ) : canCollect ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="or-number">Official receipt number</Label>
            <Input
              id="or-number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="000123"
            />
          </div>
          <Button
            disabled={busy || !value.trim()}
            onClick={handleVerifyPayment}
          >
            Verify payment
          </Button>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {isFree
            ? "The cashier confirms fee-free requests before release."
            : "The cashier records payment against the official receipt."}
        </p>
      )}
    </section>
  );
}
