/**
 * The account an applicant is in the middle of confirming, handed from the
 * screen that created or found it (sign up, sign in) to the /verify-email page.
 *
 * It lives in module memory and nowhere else — not the URL, not browser
 * storage, not history state — because it carries the password: a resend
 * re-runs the signup, or re-checks the credentials, and both need it. The
 * cost is that a reload drops it, which the route handles by sending the
 * applicant back to sign in.
 *
 * Only ever written from client event handlers, so on the server it stays
 * null and nothing can leak between requests.
 */

export type PendingSignup = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  hasNoMiddleName: boolean;
  suffix: string;
};

export type PendingVerification = {
  email: string;
  password: string;
  /** Set when the account was only just created. A resend re-runs this signup,
   * which is what mints a fresh code; without it the account already exists
   * and the resend goes through the sign-in credentials instead. */
  signup?: PendingSignup;
};

let pending: PendingVerification | null = null;

export function getPendingVerification() {
  return pending;
}

export function setPendingVerification(value: PendingVerification) {
  pending = value;
}

export function clearPendingVerification() {
  pending = null;
}
