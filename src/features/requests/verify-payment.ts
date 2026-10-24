import { toast } from "sonner";
import { verifyPaymentFn } from "~/features/requests/requests.mutations";

export type PaymentVerification =
  | { requestId: string; free: true; confirmNoFee: boolean }
  | { requestId: string; free: false; orNumber: string };

/**
 * Records a payment (or the cashier's "no fee is due" confirmation) and tells
 * them how it went. Shared by the request page and the cashier counter so both
 * say the same things. Resolves true once the server has accepted it.
 */
export async function submitPaymentVerification(verification: PaymentVerification): Promise<boolean> {
  const { free, requestId } = verification;
  const response = await verifyPaymentFn({
    data: verification.free
      ? { requestId, confirmNoFee: verification.confirmNoFee }
      : { requestId, orNumber: verification.orNumber },
  });

  if (response.error) {
    toast.error(free ? "Could not confirm this request" : "Could not verify payment", {
      description: response.message,
    });
    return false;
  }

  toast.success(free ? "Fee-free request confirmed" : "Payment verified");
  return true;
}
