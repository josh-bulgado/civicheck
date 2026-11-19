import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestFeedback } from "./feedback";

export async function readRequestFeedback(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestFeedback | null> {
  const { data, error } = await supabase
    .from("request_feedback")
    .select("id, rating, ease_rating, topics, comment, created_at")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new Error("Feedback could not be loaded. Please try again.");
  return data as RequestFeedback | null;
}
