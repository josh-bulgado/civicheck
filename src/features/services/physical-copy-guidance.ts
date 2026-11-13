import { describeRequirement } from "./requirement-display";

function validIdUploadGuidance(requirementName: string): string | null {
  const title = describeRequirement(requirementName).title;
  if (!/\bvalid\s+(?:ids?|identification(?:\s+cards?)?)\b/i.test(title)) return null;
  return /\bvalid\s+(?:ids?|identification(?:\s+cards?)?)\s*(?:or\b|\/)/i.test(title)
    ? "Add a PDF or clear photos of the ID or listed alternative."
    : "Add a PDF or clear photos of the ID.";
}

export function delayedBirthUploadGuidance(requirementName: string): string | null {
  const detail = describeRequirement(requirementName).detail;
  const instruction = validIdUploadGuidance(requirementName)
    ?? "Upload one complete copy of each document (all pages).";
  return detail
    ? `${instruction} Physical document instructions: ${detail}`
    : physicalCopyGuidance(requirementName);
}

export function physicalCopyGuidance(requirementName: string): string | null {
  const idGuidance = validIdUploadGuidance(requirementName);
  const hasCopyCount = /\b(?:\d+|one|two|three|four|five)\s*\)?\s+(?:(?:original|certified|xerox|PSA)(?:\/certified)?\s+)*(?:copies|copy|photocopies|photocopy)\b/i.test(requirementName);
  if (!hasCopyCount) return idGuidance;
  // Keep the saved wording: original, photocopy, alternatives, and "each" matter.
  const detail = describeRequirement(requirementName).detail;
  const instruction = idGuidance ?? "Upload one complete copy of each document (all pages).";
  return detail
    ? `${instruction} Physical document instructions: ${detail}`
    : `${instruction} Bring the physical copies specified in the requirement to CCRO.`;
}
