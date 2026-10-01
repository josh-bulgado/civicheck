import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePermissions } from "~/hooks/usePermissions";
import { verifyPaymentFn } from "~/features/requests/requests.mutations";
import { getStatusDetails } from "~/features/requests/request-workflow";

export function PaymentVerificationPanel({
  requestId,
  status,
  feesDue,
  paymentStatus,
  orNumber,
  onVerified,
}: {
  requestId: string;
  status: string;
  feesDue: number;
  paymentStatus: string;
  orNumber: string | null;
  onVerified: () => void;
}) {
  const { can } = usePermissions();
  const canCollect = can("requests:collect_payment");
  const isReadyForRelease = status === "ready_for_release";

  const [value, setValue] = useState("");
  const [confirmedFree, setConfirmedFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFree = feesDue <= 0;

  async function handleVerifyPayment() {
    setBusy(true);
    try {
      const res = await verifyPaymentFn({ data: isFree ? { requestId, confirmFree: confirmedFree } : { requestId, orNumber: value },
      });
      if (res.error) {
        toast.error("Could not verify payment", { description: res.message });
        return;
      }
      toast.success(isFree ? "Marked as free" : "Payment verified");
      setValue("");
      setConfirmedFree(false);
      onVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-1 text-lg font-bold text-foreground">Payment</h2>
      <p className="mb-4 text-sm text-muted-foreground">Fee due: ₱{feesDue.toFixed(2)}</p>

      {paymentStatus === "verified" ? (
        <p className="text-sm text-foreground">
          {isFree ? (
            "Confirmed free — no fee was due."
          ) : (
            <>
              Verified against OR <span className="font-bold">{orNumber ?? "—"}</span>.
            </>
          )}
        </p>
      ) : !isReadyForRelease ? (
        <p className="text-sm italic text-muted-foreground">
          Payment can't be collected yet — this request is still{" "}
          {getStatusDetails(status).label.toLowerCase()}. It needs to be
          approved for release first.
        </p>
      ) : canCollect ? (
        <div className="flex flex-col gap-3">
          {isFree ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm-free"
                checked={confirmedFree}
                onCheckedChange={(checked) => setConfirmedFree(checked === true)}
              />
              <Label htmlFor="confirm-free">This request is free — no payment due</Label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="or-number">Official receipt number</Label>
              <Input
                id="or-number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="OR-000123"
              />
            </div>
          )}
          <Button
            disabled={busy || (isFree ? !confirmedFree : !value.trim())}
            onClick={handleVerifyPayment}
          >
            {isFree ? "Confirm free" : "Verify payment"}
          </Button>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          The cashier records payment against the official receipt.
        </p>
      )}
    </section>
  );
}
