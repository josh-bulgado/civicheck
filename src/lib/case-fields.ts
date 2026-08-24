// Birth-registration-specific "case details" options, shared between the
// case step (which renders them) and the review step (which displays the
// chosen label back to the applicant).

export const PLACE_TYPES = [
  { value: "hospital", label: "Hospital / Clinic" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

export function placeTypeLabel(value: string): string {
  return PLACE_TYPES.find((t) => t.value === value)?.label ?? "—";
}

export const INFORMANT_RELATIONSHIPS = [
  "Mother",
  "Father",
  "Grandparent",
  "Guardian",
  "Physician / Midwife",
  "Other",
];
