import { describeRequirement } from "./requirement-display";

function physicalCopyCounts(requirementName: string) {
  const words = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const matches = requirementName.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*\)?\s+(?:(?:original|certified|xerox|PSA)(?:\/certified)?\s+)*(?:copies|copy|photocopies|photocopy)\b/gi);
  return Array.from(matches, match => Number(match[1]) || words.indexOf(match[1].toLowerCase()) + 1);
}

function validIdUploadGuidance(requirementName: string): string | null {
  const title = describeRequirement(requirementName).title;
  if (!/\bvalid\s+(?:ids?|identification(?:\s+cards?)?)\b/i.test(title)) return null;
  if (!physicalCopyCounts(requirementName).some(count => count >= 2)) {
    return "Add a PDF or photograph each page.";
  }
  return /\bvalid\s+(?:ids?|identification(?:\s+cards?)?)\s*(?:or\b|\/)/i.test(title)
    ? "Upload only one (1) copy of each required ID or listed alternative as a PDF or clear photos."
    : "Upload only one (1) copy of each required ID as a PDF or clear photos.";
}

function uploadInstruction(requirementName: string) {
  return validIdUploadGuidance(requirementName) ?? (
    physicalCopyCounts(requirementName).some(count => count >= 2)
      ? "Upload only one (1) copy of each document (all pages)."
      : "Add a PDF or photograph each page."
  );
}

function hasOnlyOneCopy(requirementName: string) {
  // Presenting an original and leaving a copy are separate instructions.
  if (/\boriginal\s+to be presented\b/i.test(requirementName)) return false;
  const counts = physicalCopyCounts(requirementName);
  return counts.length === 0 || (counts.length === 1 && counts[0] === 1);
}

export function delayedBirthUploadGuidance(requirementName: string): string | null {
  const detail = describeRequirement(requirementName).detail;
  const instruction = uploadInstruction(requirementName);
  if (hasOnlyOneCopy(requirementName)) return instruction;
  return detail
    ? `${instruction} Bring to CCRO: ${detail.replace(/;\s*secure from (?:the )?/gi, ". From: ")}`
    : physicalCopyGuidance(requirementName);
}

export function physicalCopyGuidance(requirementName: string): string | null {
  if (hasOnlyOneCopy(requirementName)) return uploadInstruction(requirementName);
  const idGuidance = validIdUploadGuidance(requirementName);
  const hasCopyCount = physicalCopyCounts(requirementName).length > 0;
  if (!hasCopyCount) return idGuidance;
  // Keep the saved wording: original, photocopy, alternatives, and "each" matter.
  const detail = describeRequirement(requirementName).detail;
  const instruction = uploadInstruction(requirementName);
  if (hasOnlyOneCopy(requirementName)) return instruction;
  return detail
    ? `${instruction} Bring to CCRO: ${detail.replace(/;\s*secure from (?:the )?/gi, ". From: ")}`
    : `${instruction} Bring the listed copies to CCRO.`;
}
