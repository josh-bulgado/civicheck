import { createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { getRequestNetworkSignal } from "./network-signal.server";

type AuthenticationSecurityEvent = {
  type: "sign_in_failed" | "admin_session_started" | "staff_session_started";
  actorProfileId?: string;
  email?: string;
};

function fingerprintIdentifier(email: string | undefined) {
  const secret = process.env.SECURITY_EVENT_HASH_SECRET;
  if (!email || !secret) return null;

  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
}

/** Best-effort, metadata-only authentication telemetry. Login must never depend on it. */
export async function recordAuthenticationSecurityEvent({
  type,
  actorProfileId,
  email,
}: AuthenticationSecurityEvent) {
  // Sign-in failures happen before a role is known and may belong to an
  // applicant, so no network signal is captured for them — only for
  // already-identified staff/administrator sessions.
  const { maskedIpAddress, userAgent, deviceLabel } =
    type === "sign_in_failed"
      ? { maskedIpAddress: null, userAgent: null, deviceLabel: null }
      : getRequestNetworkSignal();

  const summary =
    type === "sign_in_failed"
      ? "A password sign-in was rejected. No submitted identifier or network address was retained."
      : `A ${type === "admin_session_started" ? "privileged administrator" : "CCRO staff"} session started${
          deviceLabel ? ` from ${deviceLabel}` : ""
        }${maskedIpAddress ? ` on network ${maskedIpAddress}` : ""}.`;

  const { error } = await getSupabaseAdminClient()
    .from("system_security_events")
    .insert({
      event_type: type,
      risk_level: type === "sign_in_failed" ? "medium" : "low",
      actor_profile_id: actorProfileId ?? null,
      subject_fingerprint: fingerprintIdentifier(email),
      masked_ip_address: maskedIpAddress,
      user_agent: userAgent,
      summary,
    });

  if (error) {
    console.warn("Security authentication telemetry could not be recorded.");
  }
}
