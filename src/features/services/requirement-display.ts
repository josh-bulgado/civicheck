import { parseRequirementName, splitCaseLabel } from "~/features/services/service-utils";

export function requirementDisplayName(name: string): string {
  return splitCaseLabel(name).name;
}

/** Separate a document's name from examples, copy counts, and collection notes. */
export function describeRequirement(requirementName: string): { title: string; detail: string | null } {
  const name = requirementDisplayName(requirementName);
  const { primary, secondary } = parseRequirementName(name);
  const details: string[] = [];
  let title = primary;

  // Commas inside an example list or a document's qualifier are not separators.
  let depth = 0;
  let comma = -1;
  for (let index = 0; index < title.length; index++) {
    if (title[index] === "(") depth++;
    else if (title[index] === ")") depth = Math.max(0, depth - 1);
    else if (title[index] === "," && depth === 0) { comma = index; break; }
  }
  const note = title.search(/\s+\((?:e\.g\.|for example\b|such as\b|if\b|for\b|\d+\s+(?:(?:original|certified)\s+)?(?:copies|copy|photocopies|photocopy)\b)/i);
  const separators = [comma, note].filter((index) => index > 0);
  if (separators.length) {
    const index = Math.min(...separators);
    details.push(title.slice(index + (title[index] === "," ? 1 : 0)).trim());
    title = title.slice(0, index).trim();
  }

  const copies = title.match(/^((?:\d+|[a-z]+(?:\s+\(\d+\))?)\s+(?:(?:original|certified)\s+)?(?:copies|copy|photocopies|photocopy))\s+of\s+(.+)$/i);
  if (copies) {
    title = copies[2];
    details.unshift(copies[1]);
  }
  if (secondary) details.push(secondary);

  return { title: title || name || "Document", detail: details.filter(Boolean).join("; ") || null };
}
