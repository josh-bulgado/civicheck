import { getSupabaseAdminClient } from "~/utils/supabase";
import { bucketKey, getClientIp, RATE_LIMITS, type RateLimitRule } from "./rate-limit";

type AuthAction = "sign-in" | "sign-up";
type AuthAttempt = {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil?: number;
  message?: string;
};

const LOCKED_MESSAGE = "Too many attempts. Please wait 15 minutes before trying again.";
const UNAVAILABLE_MESSAGE = "We couldn't check your attempts. Please try again shortly.";

/** Read the deadline from the shared counter, never from a browser's count. */
async function readAttemptState(bucket: string, rule: RateLimitRule) {
  const { data, count, error } = await getSupabaseAdminClient()
    .from("rate_limit_hits")
    .select("hit_at", { count: "exact" })
    .eq("bucket", bucket)
    .gt("hit_at", new Date(Date.now() - rule.windowSeconds * 1000).toISOString())
    .order("hit_at", { ascending: true })
    .limit(1);
  if (error || count === null) throw new Error("Could not read authentication attempts");
  return {
    attemptsRemaining: Math.max(0, rule.limit - count),
    lockedUntil: count >= rule.limit && data?.[0]
      ? new Date(data[0].hit_at).getTime() + rule.windowSeconds * 1000
      : undefined,
  };
}

/** Check both account cooldowns without spending another attempt or extending it. */
export async function checkAuthLockout(email: string): Promise<AuthAttempt> {
  try {
    const states = await Promise.all([
      readAttemptState(bucketKey("sign-in:email", email), RATE_LIMITS.signInPerEmail),
      readAttemptState(bucketKey("sign-up:email", email), RATE_LIMITS.signUpPerEmail),
    ]);
    const lockedUntil = Math.max(...states.map(state => state.lockedUntil ?? 0));
    return {
      allowed: lockedUntil === 0,
      attemptsRemaining: Math.min(...states.map(state => state.attemptsRemaining)),
      lockedUntil: lockedUntil || undefined,
      message: lockedUntil ? LOCKED_MESSAGE : undefined,
    };
  } catch (error) {
    console.error("Authentication lockout check failed:", error);
    return { allowed: false, attemptsRemaining: 0, message: UNAVAILABLE_MESSAGE };
  }
}

/**
 * Reserve before contacting Auth. The existing Postgres RPC serializes parallel
 * submissions, persists across reloads/servers, and lets exactly five through.
 * Auth attempts fail closed when the counter is unavailable.
 */
export async function reserveAuthAttempt(action: AuthAction, email: string): Promise<AuthAttempt> {
  const emailRule = action === "sign-in" ? RATE_LIMITS.signInPerEmail : RATE_LIMITS.signUpPerEmail;
  const ipRule = action === "sign-in" ? RATE_LIMITS.signInPerIp : RATE_LIMITS.signUpPerIp;
  const ip = getClientIp();
  const buckets = [
    ...(ip ? [{ bucket: bucketKey(`${action}:ip`, ip), rule: ipRule }] : []),
    { bucket: bucketKey(`${action}:email`, email), rule: emailRule },
  ];
  try {
    for (const { bucket, rule } of buckets) {
      const { data, error } = await getSupabaseAdminClient().rpc("consume_rate_limit", {
        p_bucket: bucket,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      });
      if (error || typeof data !== "boolean") throw new Error("Could not reserve authentication attempt");
      if (!data) {
        return { allowed: false, ...await readAttemptState(bucket, rule), message: LOCKED_MESSAGE };
      }
    }
    return {
      allowed: true,
      ...await readAttemptState(bucketKey(`${action}:email`, email), emailRule),
    };
  } catch (error) {
    console.error("Authentication attempt check failed:", error);
    return { allowed: false, attemptsRemaining: 0, message: UNAVAILABLE_MESSAGE };
  }
}

/** The fifth unsuccessful submission immediately locks the form. */
export function authAttemptFailure(attempt: AuthAttempt, message: string) {
  return {
    error: true as const,
    message: attempt.lockedUntil ? LOCKED_MESSAGE : message,
    attemptsRemaining: attempt.attemptsRemaining,
    lockedUntil: attempt.lockedUntil,
  };
}

/** A successful password check or signup starts a fresh per-account allowance. */
export async function clearAuthAttempts(action: AuthAction, email: string) {
  try {
    const { error } = await getSupabaseAdminClient().from("rate_limit_hits")
      .delete().eq("bucket", bucketKey(`${action}:email`, email));
    if (error) console.error("Could not clear authentication attempts:", error.message);
  } catch (error) {
    console.error("Could not clear authentication attempts:", error);
  }
}
