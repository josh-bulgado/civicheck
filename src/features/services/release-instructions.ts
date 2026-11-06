import { formatPesoFee } from "./service-utils";

export const READY_TO_CLAIM = "Your document is ready to be claimed from the CCRO staff.";
export const DOCUMENT_RELEASED = "Your requested document has been released to you.";

export function readyForReleaseInstruction(paymentStatus: string | null | undefined, feesDue: number | null | undefined): string {
  if (paymentStatus === "verified") return READY_TO_CLAIM;
  if (feesDue != null && feesDue <= 0) return "Please wait for the cashier to confirm that no payment is required.";
  if (feesDue != null) return `Please pay ${formatPesoFee(feesDue)} at the CCRO cashier.`;
  return "Please pay any outstanding fee at the CCRO cashier, or wait for the cashier to confirm that no payment is required.";
}
