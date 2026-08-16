import { createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "~/utils/supabase";

type AuthenticationSecurityEvent = {
  type: "sign_in_failed" | "admin_session_started";
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
  const { error } = await getSupabaseAdminClient()
    .from("system_security_events")
    .insert({
      event_type: type,
      risk_level: type === "sign_in_failed" ? "medium" : "low",
      actor_profile_id: actorProfileId ?? null,
      subject_fingerprint: fingerprintIdentifier(email),
      summary:
        type === "sign_in_failed"
          ? "A password sign-in was rejected. No submitted identifier or network address was retained."
          : "A privileged administrator session started.",
    });

  if (error) {
    console.warn("Security authentication telemetry could not be recorded.");
  }
}
