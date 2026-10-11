/**
 * Predefined rejection reasons offered to CCRO staff on the request detail
 * page, so a rejection is a pick-from-a-list decision rather than free typing.
 *
 * The strings are stored verbatim as the rejection reason and shown to the
 * applicant (and in their email), so each one is worded as plain, applicant-
 * facing language that says what was wrong. Staff can still choose "Other" and
 * write their own when none of these fit.
 *
 * NOTE: draft wording — confirm the final list with the CCRO before release.
 */

/** Reasons for rejecting one uploaded requirement (a single document). */
export const DOCUMENT_REJECTION_REASONS = [
  "The file is blurry or unreadable.",
  "The document is cut off or missing pages.",
  "This is not the document required for this requirement.",
  "The document is expired or no longer valid.",
  "The details on the document do not match the request.",
] as const;

/** Reasons for rejecting the request as a whole. */
export const REQUEST_REJECTION_REASONS = [
  "The applicant is not eligible to request this document.",
  "The details provided do not match the records on file.",
  "No matching record could be found at the CCRO.",
  "This is a duplicate of an existing request.",
] as const;
