/** A short lease coordinates staff without permanently assigning the request. */
export const REQUEST_CLAIM_LEASE_MS = 15 * 60 * 1000;
export const REQUEST_CLAIM_RENEW_MS = 5 * 60 * 1000;

export interface RequestClaim {
  staffId: string;
  staffName: string;
  stage: string;
  claimedAt: string;
  expiresAt: string;
  isMine: boolean;
}

export function isRequestClaimActive(
  claim: RequestClaim | null,
  status: string | null,
  now = Date.now(),
): claim is RequestClaim {
  return (
    claim != null &&
    claim.stage === status &&
    Date.parse(claim.expiresAt) > now
  );
}

export function requestClaimBlockedReason(
  claim: RequestClaim | null,
  status: string | null,
  now = Date.now(),
): string | null {
  if (isRequestClaimActive(claim, status, now)) {
    return claim.isMine ? null : `${claim.staffName} is handling this stage`;
  }
  return "Start handling this stage first";
}
