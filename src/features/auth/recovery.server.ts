import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { getSupabaseAdminClient, secureCookiesEnabled } from "~/utils/supabase";
import { bucketKey, getClientIp } from "~/server/rate-limit";
import { findAuthUserByEmail } from "~/server/auth-users";
import { sendEmail } from "~/utils/resend";
import { renderPasswordResetEmail, renderPasswordResetEmailText } from "~/utils/email-template";
import { RECOVERY_INVALID_CODE, RECOVERY_WRONG_CODE } from "./recovery";

const RESET_COOKIE = "civicheck-password-reset";
const EMPTY_DIGEST = Buffer.alloc(32);

function digest(value: string) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing recovery signing key");
  return createHmac("sha256", key).update(`recovery:${value}`).digest("hex");
}

export function hashRecoveryCode(id: string, code: string) {
  return digest(`code:${id}:${code}`);
}

/** Fresh eight-digit code, including leading zeroes; never Math.random(). */
export function generateRecoveryCode() {
  return String(randomInt(100_000_000)).padStart(8, "0");
}

export async function reserveRecoverySend(email: string) {
  const id = randomUUID();
  const code = generateRecoveryCode();
  const emailBucket = bucketKey("recovery-send:email", email);
  const { data, error } = await getSupabaseAdminClient({ requestTimeoutMs: 5000 }).rpc("reserve_recovery_send", {
    p_email_bucket: emailBucket,
    p_ip_bucket: bucketKey("recovery-send:ip", getClientIp() ?? "unknown"),
    p_id: id, p_code_hash: hashRecoveryCode(id, code),
  });
  if (error || !data || typeof data.allowed !== "boolean" || !Number.isFinite(data.retryAfterSeconds)) {
    throw new Error("Recovery send limiter unavailable");
  }
  // The code is passed only to the registered background task, never returned
  // from a server function, put in a cookie, or stored as plaintext.
  return { allowed: data.allowed as boolean, retryAfterSeconds: data.retryAfterSeconds as number,
    id, code, emailBucket };
}

export async function deliverRecoveryCode(email: string, reservation: Awaited<ReturnType<typeof reserveRecoverySend>>) {
  const admin = getSupabaseAdminClient({ requestTimeoutMs: 8000 });
  const user = await findAuthUserByEmail(admin, email);
  if (!user?.email || !user.email_confirmed_at) return;
  // A delayed task cannot attach an owner to, or send, an obsolete challenge.
  const { data, error } = await admin.from("password_recovery_challenges")
    .update({ user_id: user.id }).eq("id", reservation.id)
    .gt("expires_at", new Date().toISOString()).is("consumed_at", null).lt("wrong_attempts", 5)
    .select("id").maybeSingle();
  if (error) throw new Error("Recovery challenge unavailable");
  if (!data) return;
  const firstName = typeof user.user_metadata?.first_name === "string"
    ? user.user_metadata.first_name : undefined;
  await sendEmail({
    category: "auth",
    to: user.email, subject: "Reset your CiviCheck password",
    html: renderPasswordResetEmail(reservation.code, firstName),
    text: renderPasswordResetEmailText(reservation.code, firstName),
  });
}

export async function verifyRecoveryCode(email: string, code: string) {
  const admin = getSupabaseAdminClient({ requestTimeoutMs: 5000 });
  const emailBucket = bucketKey("recovery-send:email", email);
  const { data: row, error } = await admin.from("password_recovery_challenges")
    .select("id, code_hash, user_id").eq("email_bucket", emailBucket).maybeSingle();
  if (error) throw new Error("Recovery challenge unavailable");
  const expected = typeof row?.code_hash === "string" && /^[0-9a-f]{64}$/.test(row.code_hash)
    ? Buffer.from(row.code_hash, "hex") : EMPTY_DIGEST;
  const candidate = Buffer.from(hashRecoveryCode(row?.id ?? "missing", code), "hex");
  // Always compare two full-length digests, including a missing/expired code.
  const matched = timingSafeEqual(expected, candidate) && !!row?.user_id;
  const grant = randomBytes(32).toString("base64url");
  const { data: outcome, error: checkError } = await admin.rpc("finish_recovery_code_check", {
    p_email_bucket: emailBucket, p_id: row?.id ?? null,
    p_matched: matched, p_grant_hash: digest(`grant:${row?.id ?? "missing"}:${grant}`),
  });
  if (checkError || !["verified", "wrong", "invalid"].includes(outcome)) throw new Error("Recovery verification unavailable");
  if (outcome !== "verified") return { error: true as const, codeInvalid: outcome === "invalid",
    message: outcome === "invalid" ? RECOVERY_INVALID_CODE : RECOVERY_WRONG_CODE };
  setCookie(RESET_COOKIE, `${row!.id}.${grant}`, {
    path: "/", httpOnly: true, secure: secureCookiesEnabled(), sameSite: "lax", maxAge: 600,
  });
  return { error: false as const };
}

export async function consumePasswordResetGrant(): Promise<string | null> {
  const cookie = getCookie(RESET_COOKIE);
  deleteCookie(RESET_COOKIE, { path: "/" });
  if (!cookie || cookie.length > 128) return null;
  const [id, grant, extra] = cookie.split(".");
  if (!/^[0-9a-f-]{36}$/i.test(id ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(grant ?? "") || extra) return null;
  const { data, error } = await getSupabaseAdminClient({ requestTimeoutMs: 5000 }).rpc("consume_password_reset_grant", {
    p_id: id, p_grant_hash: digest(`grant:${id}:${grant}`),
  });
  if (error) throw new Error("Recovery authorization unavailable");
  return typeof data === "string" ? data : null;
}
