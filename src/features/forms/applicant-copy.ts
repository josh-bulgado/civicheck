const CLEARER_APPLICANT_COPY: Readonly<Record<string, string>> = {
  "Informant's relationship to the child":
    "Informant's relationship to the person",
  "Choose whether the person was born in Legazpi City or another city/municipality.": "",
  "We use this date to select the correct age group.": "",
  "Select Yes if additional identity proof is available or requested by CCRO.": "",
  "Case details": "Request details",
  "Find the right service": "Answer a few questions",
  "Find the right delayed-registration service":
    "Answer a few questions about delayed registration",
  "Choose the answers that match this case. We’ll select the correct service.":
    "Your answers help us select the right service.",
  "Answer these questions so we can apply the correct fee, parties, process, and requirements.":
    "Your answers help us select the correct service, fee, process, and requirements.",
  "Use the registration track that matches the birth date.":
    "Use the registration type that matches the birth date.",
  "Age of the person to be registered":
    "How old is the person being registered?",
  "Registration program": "How will the birth be registered?",
  "BRAP-assisted registration": "With BRAP assistance",
  "We calculate the correct 0-79 or 80+ registration track from this date.":
    "",
};

/** Keeps already-published templates clear while their stored copy is migrated. */
export function applicantCopy(value: string): string;
export function applicantCopy(value: string | undefined): string | undefined;
export function applicantCopy(value: string | undefined) {
  return value === undefined ? undefined : (CLEARER_APPLICANT_COPY[value] ?? value);
}
