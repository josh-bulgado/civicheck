import { canVerifyPayment } from "~/features/requests/payment-eligibility";
import type { CashierLookupResult } from "~/features/requests/requests.queries";

/** What the counter slip lets the cashier do with the request in front of them. */
export type SlipPhase =
  /** Eligible with a fee: take the official receipt number. */
  | "collect"
  /** Eligible, no fee: tick that nothing is due. */
  | "confirm-free"
  /** Not eligible for payment yet. */
  | "not-ready"
  /** Verified earlier, before this lookup. */
  | "settled"
  /** Verified a moment ago, at this window. */
  | "just-verified";

/** The payment the cashier has just recorded, kept so the slip can say so. */
export interface VerifiedPayment {
  free: boolean;
  orNumber: string;
}

/** Mirrors the rules `verifyPaymentFn` enforces, so the slip never offers what the server refuses. */
export function getSlipPhase(
  result: Pick<CashierLookupResult, "status" | "paymentStatus" | "feesDue" | "serviceCode" | "postingStartDate">,
  verified: VerifiedPayment | null,
): SlipPhase {
  if (verified) return "just-verified";
  if (result.paymentStatus === "verified") return "settled";
  if (!canVerifyPayment(result.status, result.serviceCode, result.postingStartDate)) return "not-ready";
  return result.feesDue > 0 ? "collect" : "confirm-free";
}

/** True while the slip is asking the cashier to record something. */
export function isTakingPayment(phase: SlipPhase): boolean {
  return phase === "collect" || phase === "confirm-free";
}
