import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePermissions } from "~/hooks/usePermissions";
import { verifyPaymentFn } from "~/features/requests/requests.mutations";

export function PaymentVerificationPanel({
  requestId,
  feesDue,
  paymentStatus,
  orNumber,
  onVerified,
}: {
  requestId: string;
  feesDue: number;
  paymentStatus: string;
  orNumber: string | null;
  onVerified: () => void;
}) {
  const { can } = usePermissions();
  const canCollect = can("requests:collect_payment");

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleVerifyPayment() {
    setBusy(true);
    try {
      const res = await verifyPaymentFn({ data: { requestId, orNumber: value } });
      if (res.error) {
        toast.error("Could not verify payment", { description: res.message });
        return;
      }
      toast.success("Payment verified");
      setValue("");
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
          Verified against OR <span className="font-bold">{orNumber ?? "—"}</span>.
        </p>
      ) : canCollect ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="or-number">Official receipt number</Label>
            <Input
              id="or-number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="OR-000123"
            />
          </div>
          <Button disabled={busy || !value.trim()} onClick={handleVerifyPayment}>
            Verify payment
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
