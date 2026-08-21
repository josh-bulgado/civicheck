import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { isVisible } from "~/features/services/service-utils";
import { loadServiceCatalogue, resolveServices } from "~/features/services/services.catalogue";

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

    // The wizard's upload step won't let an applicant past it without every
    // mandatory, applicable document attached — but that gate is purely
    // client-side. Re-check it here so a request can never actually be
    // created missing one, no matter how this function gets called. Uses the
    // same catalogue resolution getServiceDetail() uses (requirement rows key
    // by requirement_group/display_group, not always by service_code), so
    // this stays in lockstep with whatever checklist the wizard showed.
    const catalogue = await loadServiceCatalogue();
    const { services: resolvedServices, isGroup } = resolveServices(catalogue, data.serviceCode);
    if (resolvedServices.length === 0) {
      return { error: true, message: "Unknown service." };
    }
    const requirementKey = isGroup
      ? resolvedServices[0].display_group!
      : (resolvedServices[0].requirement_group ?? data.serviceCode);
    const requirements = catalogue.requirementsByGroup.get(requirementKey) ?? [];

    const applicableMandatory = requirements.filter(
      (r) => r.is_mandatory && isVisible(r, data.serviceCode),
    );
    const uploadedNames = new Set((data.documents ?? []).map((d) => d.requirementName));
    const missing = applicableMandatory.filter(
      (r) => !uploadedNames.has(r.requirement_name),
    );
    if (missing.length > 0) {
      return {
        error: true,
        message: `Missing required document(s): ${missing.map((r) => r.requirement_name).join(", ")}.`,
      };
    }

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
