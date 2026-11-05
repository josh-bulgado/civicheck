import { compare } from "bcryptjs";
import { waitUntil } from "@vercel/functions";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { sendEmail } from "~/utils/resend";

export const INVALID_CREDENTIALS = "Invalid email or password";

export async function getLoginAccountInfo(email: string) {
  const { data, error } = await getSupabaseAdminClient({ requestTimeoutMs: 5000 })
    .rpc("login_account_security_info", { p_email: email });
  if (error || !data || typeof data.needsDummyPassword !== "boolean" ||
      !Number.isInteger(data.bcryptCost) || data.bcryptCost < 4 || data.bcryptCost > 16) {
    throw new Error("Account security lookup unavailable");
  }
  return {
    email: typeof data.email === "string" ? data.email : null,
    needsDummyPassword: data.needsDummyPassword as boolean,
    bcryptCost: data.bcryptCost as number,
  };
}

/** Fixed dummy salt/digest, never a real credential. The result is discarded. */
export async function compareDummyPassword(password: string, cost: number) {
  await compare(password, `$2b$${String(cost).padStart(2, "0")}$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`);
}

/** Register work before returning. Locally await it so it is never orphaned. */
export async function runAuthBackground(work: Promise<unknown>) {
  const safeWork = work.catch(() => {
    // No provider error bodies: they can contain recipients or reset tokens.
    console.error("Authentication background task failed");
  });
  if (process.env.VERCEL === "1") waitUntil(safeWork);
  else await safeWork;
}

export async function sendLoginSecurityNotification(email: string) {
  await sendEmail({
    category: "auth",
    to: email,
    subject: "Unusual sign-in activity on your CiviCheck account",
    text: "We noticed repeated unsuccessful attempts to sign in to your CiviCheck account. Your account has not been locked. If this was not you, consider changing your password using the CiviCheck website. Never share your password or verification codes.",
    html: "<p>We noticed repeated unsuccessful attempts to sign in to your CiviCheck account.</p><p>Your account has not been locked. If this was not you, consider changing your password using the CiviCheck website.</p><p>Never share your password or verification codes.</p>",
  });
}

export async function sendPasswordChangedNotification(email: string) {
  await sendEmail({
    category: "auth",
    to: email, subject: "Your CiviCheck password was changed",
    text: "Your CiviCheck password was changed. If you did not make this change, reset your password immediately using the CiviCheck website and contact support. Never share your password or verification codes.",
    html: "<p>Your CiviCheck password was changed.</p><p>If you did not make this change, reset your password immediately using the CiviCheck website and contact support. Never share your password or verification codes.</p>",
  });
}
