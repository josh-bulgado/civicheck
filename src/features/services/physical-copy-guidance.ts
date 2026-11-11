import { describeRequirement } from "./requirement-display";

export function physicalCopyGuidance(requirementName: string): string | null {
  const hasCopyCount = /\b(?:\d+|one|two|three|four|five)\s*\)?\s+(?:(?:original|certified|xerox|PSA)(?:\/certified)?\s+)*(?:copies|copy|photocopies|photocopy)\b/i.test(requirementName);
  if (!hasCopyCount) return null;
  // Keep the saved wording: original, photocopy, alternatives, and "each" matter.
  const detail = describeRequirement(requirementName).detail;
  return detail
    ? `Upload one complete copy of each document (all pages). Physical document instructions: ${detail}`
    : "Upload one complete copy of each document (all pages). Bring the physical copies specified in the requirement to CCRO.";
}
