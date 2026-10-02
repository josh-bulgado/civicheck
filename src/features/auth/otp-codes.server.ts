import { createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "~/utils/supabase";

export type OtpPurpose = "signup" | "recovery";

/** Matches the "expires in 1 hour" promised in the OTP emails. */
const CODE_LIFETIME_MS = 60 * 60 * 1000;

const WRONG_CODE = "Wrong code. Please check it and try again.";
const OLD_CODE =
  "That's an old code. Enter the newest one we sent to your email.";
const EXPIRED_CODE = "This code has expired. Tap Resend to get a new one.";

function hashCode(email: string, code: string) {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "")
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

/** Remembers an emailed code so a later rejection can be explained. Best-effort. */
export async function recordIssuedOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
) {
  const { error } = await getSupabaseAdminClient()
    .from("auth_otp_codes")
    .insert({
      email: email.trim().toLowerCase(),
      purpose,
      code_hash: hashCode(email, code),
    });
  if (error) console.error("Failed to record issued OTP:", error);
}

/** Drops the remembered codes once one of them has been used. */
export async function clearIssuedOtps(email: string, purpose: OtpPurpose) {
  await getSupabaseAdminClient()
    .from("auth_otp_codes")
    .delete()
    .eq("email", email.trim().toLowerCase())
    .eq("purpose", purpose);
}

/**
 * Turns Supabase's catch-all "Token has expired or is invalid" into a plain
 * message: a code we never sent is wrong, the newest code past its lifetime
 * has expired, and any other code we sent has been replaced or already used.
 */
export async function describeRejectedOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
) {
  const { data: issued } = await getSupabaseAdminClient()
    .from("auth_otp_codes")
    .select("code_hash, issued_at")
    .eq("email", email.trim().toLowerCase())
    .eq("purpose", purpose)
    .order("issued_at", { ascending: false });

  const codeHash = hashCode(email, code);
  const matchIndex = issued?.findIndex((row) => row.code_hash === codeHash) ?? -1;
  if (matchIndex === -1) return WRONG_CODE;

  const isNewest = matchIndex === 0;
  const isPastLifetime =
    Date.now() - new Date(issued![matchIndex].issued_at).getTime() >
    CODE_LIFETIME_MS;
  return isNewest && isPastLifetime ? EXPIRED_CODE : OLD_CODE;
}
