import type { CashierLookupResult } from "~/features/requests/requests.queries";

/** What the counter slip lets the cashier do with the request in front of them. */
export type SlipPhase =
  /** Ready for release with a fee: take the official receipt number. */
  | "collect"
  /** Ready for release, no fee: tick that nothing is due. */
  | "confirm-free"
  /** Not at Ready for Release yet, so payment cannot be taken. */
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
  result: Pick<CashierLookupResult, "status" | "paymentStatus" | "feesDue">,
  verified: VerifiedPayment | null,
): SlipPhase {
  if (verified) return "just-verified";
  if (result.paymentStatus === "verified") return "settled";
  if (result.status !== "ready_for_release") return "not-ready";
  return result.feesDue > 0 ? "collect" : "confirm-free";
}

/** True while the slip is asking the cashier to record something. */
export function isTakingPayment(phase: SlipPhase): boolean {
  return phase === "collect" || phase === "confirm-free";
}
