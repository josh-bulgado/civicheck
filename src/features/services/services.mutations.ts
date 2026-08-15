import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const submitRequestFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      serviceCode: string;
      fee: number;
      formData: any;
      documents?: Array<{
        requirementName: string;
        fileUrl: string;
      }>;
    }) => d,
  )
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
    let requestId: string | null = null;
    let attempts = 0;
    const maxAttempts = 5;
    let lastErrorMsg = "";

    while (!requestId && attempts < maxAttempts) {
      attempts++;
      const randStr = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      trackingNumber = `CCRO-${year}-${randStr}`;

      const { data: inserted, error: insertError } = await supabase
        .from("requests")
        .insert({
          applicant_id: user.id,
          request_type: data.serviceCode,
          form_data: data.formData,
          tracking_number: trackingNumber,
          fees_due: data.fee,
        })
        .select("id")
        .single();

      if (!insertError && inserted) {
        requestId = inserted.id;
      } else if (insertError) {
        lastErrorMsg = insertError.message;
        if (insertError.code === "23505") continue;
        return { error: true, message: insertError.message };
      }
    }

    if (!requestId) {
      return {
        error: true,
        message: `Could not generate a unique tracking number after ${maxAttempts} attempts: ${lastErrorMsg}`,
      };
    }

    let documentWarning: string | undefined;
    if (data.documents && data.documents.length > 0) {
      const { error: docsError } = await supabase.from("requirements_attachments").insert(
        data.documents.map((doc) => ({
          request_id: requestId,
          requirement_name: doc.requirementName,
          file_url: doc.fileUrl,
        })),
      );
      if (docsError) {
        documentWarning =
          "Your request was submitted, but we couldn't attach your uploaded documents. Please bring them with you to the CCRO.";
      }
    }

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: requestId,
      performed_by_profile_id: user.id,
      action_status: "submitted",
      remarks: "Request submitted online.",
    });
    if (logError) {
      console.error("Failed to write submission audit log", logError);
    }

    return { error: false, trackingNumber, documentWarning };
  });
