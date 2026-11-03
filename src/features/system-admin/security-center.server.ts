import { createHmac } from "node:crypto";
import { isOperationalRole } from "~/server/auth";
import type { Role } from "~/lib/permissions";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "~/utils/supabase";
import { getRequestNetworkSignal } from "./network-signal.server";

/** How a session began, kept on the event summary so an odd one stands out. */
export type SessionMethod =
  | "password"
  | "password reset"
  | "invitation"
  | "email link"
  | "social sign-in";

type AuthenticationSecurityEvent = {
  type: "sign_in_failed" | "admin_session_started" | "staff_session_started";
  actorProfileId?: string;
  email?: string;
  method?: SessionMethod;
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
  method,
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
          method && method !== "password" ? ` via ${method}` : ""
        }${deviceLabel ? ` from ${deviceLabel}` : ""
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

/**
 * Records a session start for any CCRO personnel role — staff, supervisor,
 * cashier, CCRO Administrator, System Administrator. Citizens are deliberately
 * not tracked.
 */
export async function recordSessionStarted({
  actorProfileId,
  role,
  method,
}: {
  actorProfileId: string;
  role: Role;
  method: SessionMethod;
}) {
  const type =
    role === "admin" || role === "system_admin"
      ? "admin_session_started"
      : isOperationalRole(role)
        ? "staff_session_started"
        : null;
  if (!type) return;
  await recordAuthenticationSecurityEvent({ type, actorProfileId, method });
}

/**
 * For flows that finish with a session but no password check — invitation
 * acceptance, password-reset codes and links, OAuth. Looks up who just signed
 * in from the session itself. Best-effort: signing in never depends on it.
 */
export async function recordSessionForCurrentUser(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  method: SessionMethod,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", user.id)
      .single();
    if (!profile || (profile.access_status ?? "active") !== "active") return;
    await recordSessionStarted({
      actorProfileId: user.id,
      role: profile.role as Role,
      method,
    });
  } catch {
    console.warn("Session telemetry could not be recorded.");
  }
}
