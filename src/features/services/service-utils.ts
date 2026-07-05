// ─── Service-layer UI utilities ──────────────────────────────────────────────
// Shared by ServiceHero, RequirementChecklist, ServiceDetailSheet, ServiceCard.
// Keep all parsing / formatting / content-filtering logic here so every
// component that renders service data stays in sync.

/**
 * Split a `requirement_name` string into a document name (primary) and
 * copies / source info (secondary) using the em-dash `—` delimiter that
 * already exists in the seed data.
 *
 * Examples:
 *   "Duly Accomplished Certificate of Live Birth (4 copies) — secure from the hospital"
 *   → { primary: "Duly Accomplished Certificate of Live Birth (4 copies)",
 *       secondary: "Secure from the hospital" }
 *
 *   "Valid ID, 1 photocopy with signature"
 *   → { primary: "Valid ID, 1 photocopy with signature", secondary: null }
 */
export function parseRequirementName(name: string): {
  primary: string;
  secondary: string | null;
} {
  const dashIndex = name.indexOf("—");
  if (dashIndex === -1) {
    // Also try the regular hyphen-dash pattern " - " as a fallback
    const hyphenIndex = name.indexOf(" - ");
    if (hyphenIndex === -1) {
      return { primary: name.trim(), secondary: null };
    }
    const primary = name.slice(0, hyphenIndex).trim();
    let secondary = name.slice(hyphenIndex + 3).trim();
    // Capitalize the first letter of the secondary line
    if (secondary.length > 0) {
      secondary = secondary.charAt(0).toUpperCase() + secondary.slice(1);
    }
    return { primary, secondary };
  }

  const primary = name.slice(0, dashIndex).trim();
  let secondary = name.slice(dashIndex + 1).trim();

  // Capitalize the first letter of the secondary line
  if (secondary.length > 0) {
    secondary = secondary.charAt(0).toUpperCase() + secondary.slice(1);
  }

  return { primary, secondary };
}

// ─── Editorial caveat patterns ───────────────────────────────────────────────
// These phrases indicate internal notes that leaked into user-facing step copy.
// The regex matches parenthesized text containing any of these phrases.
const EDITORIAL_PATTERNS = [
  /\(not itemized[^)]*\)/gi,
  /\(implied[^)]*\)/gi,
  /\(roughly[^)]*\)/gi,
  /\(based on the stated[^)]*\)/gi,
  /\(free of the service fee[^)]*\)/gi,
  /\bNote:\s*.+$/i,
];

/**
 * Strip internal notes, assumptions, and caveats from step text.
 * Removes:
 *   - Parenthetical asides containing editorial language
 *   - Lines starting with "Note:" (often internal clarifications)
 *
 * The cleaned text is also trimmed of trailing punctuation artifacts.
 */
export function cleanStepText(step: string): string {
  let cleaned = step;

  for (const pattern of EDITORIAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Collapse multiple spaces left by removals
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Remove trailing comma or semicolon left by removal
  cleaned = cleaned.replace(/[,;]\s*$/, "").trim();

  // Remove trailing comma before closing parenthesis
  cleaned = cleaned.replace(/,\s*\)/, ")").trim();

  return cleaned;
}

/**
 * Format a service fee for display.
 * Handles zero/null → "Free", group services → "Varies", otherwise → ₱X.XX
 */
export function formatFee(
  fee: number | string | null,
  displayGroup?: string | null,
): string {
  if (displayGroup) return "Varies";
  const numFee = Number(fee);
  if (!fee || numFee === 0) return "Free";
  return `₱${numFee.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
