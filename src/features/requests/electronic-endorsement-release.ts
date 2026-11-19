import { addMonths } from "date-fns";
import { formatDateKey, fromDateKey, toDateKey } from "~/lib/date";

export interface EndorsementDetails {
  endorsedOn: string | null;
  claimingLocation: string;
  claimingInstructions: string;
  availableAt: string | null;
}

export function endorsementDetailsOf(row: {
  psa_endorsed_on?: string | null;
  claiming_location?: string | null;
  claiming_instructions?: string | null;
  psa_certificate_available_at?: string | null;
}): EndorsementDetails {
  return {
    endorsedOn: row.psa_endorsed_on ?? null,
    claimingLocation: row.claiming_location ?? "",
    claimingInstructions: row.claiming_instructions ?? "",
    availableAt: row.psa_certificate_available_at ?? null,
  };
}

export function estimatedPsaAvailability(endorsedOn: string | null | undefined) {
  const date = endorsedOn ? fromDateKey(endorsedOn) : null;
  return date ? toDateKey(addMonths(date, 1)) : null;
}

export function endorsementReadyBlockedReason(details?: EndorsementDetails | null) {
  if (!details?.endorsedOn || !fromDateKey(details.endorsedOn)) return "Record the date the endorsement was sent to PSA first.";
  if (!details.claimingLocation.trim() || !details.claimingInstructions.trim()) return "Save the confirmed claiming location and instructions first.";
  return null;
}

export function endorsementWaitingMessage(details?: EndorsementDetails | null) {
  const estimate = estimatedPsaAvailability(details?.endorsedOn);
  return estimate
    ? `Endorsed to PSA on ${formatDateKey(details?.endorsedOn)}. Estimated availability: around ${formatDateKey(estimate)}. Wait for confirmation before visiting to claim. The estimated date does not mean the certificate is ready.`
    : "CCRO is preparing the endorsement. The final PSA certificate is expected about one month after endorsement to PSA. Wait for confirmation of availability.";
}

export function endorsementClaimingSteps(details?: EndorsementDetails | null) {
  return [
    ...(details?.claimingLocation.trim() ? [`Claiming location: ${details.claimingLocation.trim()}`] : []),
    details?.claimingInstructions.trim() || "Follow the claiming instructions provided by staff.",
  ];
}
