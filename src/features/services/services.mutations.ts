import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const submitRequestFn = createServerFn({ method: "POST" })
  .validator((d: { serviceCode: string; fee: number; formData: any }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: Please log in again." };
    }

    const year = new Date().getFullYear();
    let trackingNumber = "";
    let inserted = false;
    let attempts = 0;
    const maxAttempts = 5;
    let lastErrorMsg = "";

    while (!inserted && attempts < maxAttempts) {
      attempts++;
      const randStr = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      trackingNumber = `CCRO-${year}-${randStr}`;

      const { error: insertError } = await supabase.from("requests").insert({
        applicant_id: user.id,
        request_type: data.serviceCode,
        form_data: data.formData,
        tracking_number: trackingNumber,
        fees_due: data.fee,
      });

      if (!insertError) {
        inserted = true;
      } else {
        lastErrorMsg = insertError.message;
        if (insertError.code === "23505") continue;
        return { error: true, message: insertError.message };
      }
    }

    if (!inserted) {
      return {
        error: true,
        message: `Could not generate a unique tracking number after ${maxAttempts} attempts: ${lastErrorMsg}`,
      };
    }

    return { error: false, trackingNumber };
  });
