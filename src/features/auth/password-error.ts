import { PASSWORD_MIN, PASSWORD_RULES_MESSAGE } from "./auth.schema";

/**
 * Supabase explains a rejected password by listing every character it accepts,
 * a wall of text no one should be shown. This is the one-line version, or null
 * when the error is about something else.
 */
export function describeWeakPassword(error: {
  code?: string;
  reasons?: string[];
}): string | null {
  if (error.code !== "weak_password") return null;

  const reasons = error.reasons ?? [];
  if (reasons.includes("pwned")) {
    return "That password has appeared in a data breach. Choose a different one.";
  }
  if (reasons.includes("length") && !reasons.includes("characters")) {
    return `Use at least ${PASSWORD_MIN} characters.`;
  }
  return PASSWORD_RULES_MESSAGE;
}
