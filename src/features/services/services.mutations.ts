import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";

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
    const { supabase, user } = await requireActiveSession("requests:create");

    const created = await insertRequestWithTrackingNumber(supabase, {
      applicant_id: user.id,
      request_type: data.serviceCode,
      form_data: data.formData,
      fees_due: data.fee,
    });
    if (created.error) {
      return { error: true, message: created.message };
    }
    const { requestId, trackingNumber } = created;

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
