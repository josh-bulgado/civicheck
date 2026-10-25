/** Every service requires staff to explicitly start validation before reviewing uploads. */
export function documentReviewBlockedReason(status: string | null | undefined): string | null {
  return status === "submitted"
    ? "Start validation to review this document."
    : null;
}
