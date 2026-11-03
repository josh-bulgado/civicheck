import { getRequestNetworkSignal } from "~/features/system-admin/network-signal.server";
import { getSupabaseAdminClient } from "~/utils/supabase";

/**
 * Records that a person changed their own password. The change has already
 * happened by the time this runs, so a failure here is logged rather than
 * thrown: it must not report a successful password change as failed.
 */
export async function recordPasswordChanged(profileId: string) {
  const { maskedIpAddress, userAgent } = getRequestNetworkSignal();
  const { error } = await getSupabaseAdminClient()
    .from("system_audit_events")
    .insert({
      actor_profile_id: profileId,
      event_type: "password_changed",
      target_profile_id: profileId,
      metadata: {},
      masked_ip_address: maskedIpAddress,
      user_agent: userAgent,
    });
  if (error) console.error("Password change audit event failed", error);
}
