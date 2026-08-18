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

/**
 * Some requirement names are prefixed with the case they belong to, e.g.
 * "[Change of First Name] NBI and Police Clearance...". Pull that bracketed
 * prefix out so it can be rendered as a chip instead of sitting inline in the
 * document name.
 */
export function splitCaseLabel(name: string): {
  caseLabel: string | null;
  name: string;
} {
  const match = name.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
  if (!match) return { caseLabel: null, name: name.trim() };
  return { caseLabel: match[1].trim(), name: match[2].trim() };
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

// ─── Browse Services card helpers ────────────────────────────────────────────
// `processing_time` and `steps_description` are free-text charter language, not
// structured fields, so the signals below (visit count, fully-online, category)
// are best-effort heuristics for card display — the full text is always
// available on the service detail page.

export interface VisitBadge {
  label: "One visit" | "Several visits";
  tone: "success" | "warning";
}

/**
 * A service needs a second CCRO visit only when it carries a mandatory
 * posting/publication window the applicant has to wait out before claiming —
 * plain processing hours (however long) still resolve in one counter visit.
 */
export function getVisitBadge(processingTime: string): VisitBadge {
  const requiresReturnTrip = /posting|publication/i.test(processingTime);
  return requiresReturnTrip
    ? { label: "Several visits", tone: "warning" }
    : { label: "One visit", tone: "success" };
}

/**
 * A service is fully online when its own process never ends in an
 * in-person "claim" step (currently true only for the email inquiry service).
 */
export function isFullyOnline(steps: string[] | null): boolean {
  if (!steps || steps.length === 0) return false;
  return !steps.some((step) => /\bclaim\b/i.test(step));
}

/**
 * Compress the charter's `processing_time` sentence into a short card value:
 * prefer the posting/publication wait window (what applicants actually plan
 * around) over the initial counter-hours clause.
 */
export function summarizeWait(processingTime: string): string {
  const hasWaitWindow = /posting|publication/i.test(processingTime);
  if (hasWaitWindow) {
    const days = processingTime.match(/(\d+)[\s-]*(?:calendar[\s-]*)?days?/i);
    if (days) return `After ${days[1]} days`;
    const weeks = processingTime.match(/(\d+)[\s-]*weeks?/i);
    if (weeks) return `After ${weeks[1]} weeks`;
    const months = processingTime.match(/(\d+)(?:[\s-]*(?:to|-)[\s-]*\d+)?[\s-]*months?/i);
    if (months) return `After ${months[0]}`;
  }
  return processingTime.split(";")[0].split("(")[0].trim();
}

export type ServiceCategory =
  | "birth"
  | "marriage"
  | "death"
  | "copies"
  | "corrections";

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  birth: "Birth",
  marriage: "Marriage",
  death: "Death",
  copies: "Copies & endorsements",
  corrections: "Corrections",
};

// Services route to a category via their owning department (see
// `services_registry.department_id`, backfilled in
// `20260817120000_add_service_department.sql`) rather than a hardcoded list of
// service codes. A per-code map went stale the moment a service was split into
// several case-specific codes (e.g. `BIRTH_ONTIME` -> `OTCOLB-MARITAL` /
// `OTCOLB-NONMARITAL`) — every split silently dropped those cases out of their
// category filter. Department ownership doesn't move when a service is split.
const CATEGORY_BY_DEPARTMENT: Record<string, ServiceCategory> = {
  birth: "birth",
  marriage: "marriage",
  death: "death",
  archives: "copies",
  legal: "corrections",
};

export function getServiceCategory(
  departmentId: string | null | undefined,
): ServiceCategory | null {
  if (!departmentId) return null;
  return CATEGORY_BY_DEPARTMENT[departmentId] ?? null;
}
