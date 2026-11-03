import { createHmac } from "node:crypto";
import { getRequestIP } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "~/utils/supabase";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a few minutes and try again.";

/**
 * Attempt limits for the endpoints anyone can call. Supabase Auth sees every
 * call coming from this server's one address, so its own per-IP limits can't
 * separate visitors; these count per account and per visitor instead.
 */
export const RATE_LIMITS = {
  /** A 6-digit code is only safe if it can't be guessed at speed. */
  otpVerifyPerEmail: { limit: 5, windowSeconds: 15 * 60 },
  otpVerifyPerIp: { limit: 30, windowSeconds: 15 * 60 },
  /** Each send emails a stranger's inbox and replaces their current code. */
  otpSendPerEmail: { limit: 3, windowSeconds: 15 * 60 },
  otpSendPerIp: { limit: 10, windowSeconds: 60 * 60 },
  signInPerEmail: { limit: 10, windowSeconds: 15 * 60 },
  // An office or school shares one address, so this stays generous.
  signInPerIp: { limit: 60, windowSeconds: 15 * 60 },
  /** Tracking numbers are 6 digits; a surname is the only other factor. */
  trackingPerIp: { limit: 30, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

/** Identifiers are stored as keyed hashes, never as readable emails or addresses. */
function bucketKey(scope: string, identifier: string) {
  const digest = createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "")
    .update(identifier.trim().toLowerCase())
    .digest("hex");
  return `${scope}:${digest}`;
}

/** The visitor's address as the hosting proxy reports it, or null when unknown. */
export function getClientIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

/**
 * Records one attempt for `identifier` under `scope` and says whether it is
 * still within `rule`. A missing identifier (no client address) is not limited.
 * Fails open: if the counter can't be reached the attempt goes ahead, since
 * Supabase Auth's own limits still sit behind every auth call.
 */
export async function allowAttempt(
  scope: string,
  identifier: string | null | undefined,
  rule: RateLimitRule,
): Promise<boolean> {
  if (!identifier) return true;
  const { data, error } = await getSupabaseAdminClient().rpc("consume_rate_limit", {
    p_bucket: bucketKey(scope, identifier),
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });
  if (error) {
    console.error("Rate limit check failed:", error.message);
    return true;
  }
  return data !== false;
}
