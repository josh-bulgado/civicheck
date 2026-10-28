/**
 * Why a document on a request in `status` can't take a decision right now, or
 * null when it can. Staff explicitly start validation before reviewing uploads,
 * and a released or rejected request is closed: its documents are part of the
 * record and no longer change.
 */
export function documentReviewBlockedReason(status: string | null | undefined): string | null {
  if (status === "submitted") return "Start validation to review this document.";
  if (isClosedRequestStatus(status)) {
    return "This request is closed. Its documents can no longer change.";
  }
  return null;
}

/** Released and rejected end a request's life (TERMINAL_STATUSES). */
export function isClosedRequestStatus(status: string | null | undefined): boolean {
  return status === "released" || status === "rejected";
}
