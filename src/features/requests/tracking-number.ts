import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 5;

export type NewRequestValues = {
  applicant_id: string | null;
  request_type: string;
  form_data: unknown;
  fees_due: number;
  form_template_version_id?: string | null;
  status?: string;
};

export type InsertRequestResult =
  | { error: false; requestId: string; trackingNumber: string }
  | { error: true; message: string };

/**
 * Inserts a request, retrying on the unique-violation that a colliding random
 * tracking number produces. Shared by online submission and walk-in encoding so
 * both paths mint numbers in the same `CCRO-<year>-<6 digits>` format.
 */
export async function insertRequestWithTrackingNumber(
  supabase: SupabaseClient,
  values: NewRequestValues,
): Promise<InsertRequestResult> {
  const year = new Date().getFullYear();
  let lastErrorMsg = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const randStr = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const trackingNumber = `CCRO-${year}-${randStr}`;

    const { data: inserted, error } = await supabase
      .from("requests")
      .insert({ status: "submitted", ...values, tracking_number: trackingNumber })
      .select("id")
      .single();

    if (!error && inserted) {
      return { error: false, requestId: inserted.id, trackingNumber };
    }
    if (error) {
      lastErrorMsg = error.message;
      if (error.code === "23505") continue;
      return { error: true, message: error.message };
    }
  }

  return {
    error: true,
    message: `Could not generate a unique tracking number after ${MAX_ATTEMPTS} attempts: ${lastErrorMsg}`,
  };
}
