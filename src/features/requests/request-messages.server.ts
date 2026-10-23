import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MessageSenderRole,
  RequestMessage,
} from "~/features/requests/request-messages";
import { one } from "~/lib/embed";

/**
 * Oldest first. Runs under the caller's own RLS, so an applicant only ever
 * gets their own request's thread and staff only their department's.
 *
 * `senderName` comes from the sender's profile; an applicant cannot read staff
 * profiles, so for them it is null and the card shows "CCRO staff".
 */
export async function readRequestMessages(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestMessage[]> {
  const { data, error } = await supabase
    .from("request_messages")
    .select("id, sender_role, body, created_at, profiles(first_name, last_name)")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  type PersonName = { first_name?: string | null; last_name?: string | null };
  type MessageRow = {
    id: string;
    sender_role: string;
    body: string;
    created_at: string;
    profiles: PersonName | PersonName[] | null;
  };

  return ((data ?? []) as MessageRow[]).map((row): RequestMessage => {
    const profile = one<PersonName>(row.profiles);
    const name = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "";
    return {
      id: row.id,
      senderRole: row.sender_role as MessageSenderRole,
      senderName: name || null,
      body: row.body,
      createdAt: row.created_at,
    };
  });
}
