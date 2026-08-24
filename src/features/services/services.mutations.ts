import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { isVisible } from "~/features/services/service-utils";
import { loadServiceCatalogue, resolveServices } from "~/features/services/services.catalogue";
import {
  buildLegacyFormDefinition,
  flattenTemplateAnswers,
  parseFormTemplateDefinition,
  validateTemplateAnswers,
} from "~/features/forms/form-template.utils";

const subjectAnswerSchema = z.object({
  role: z.string().max(160),
  firstName: z.string().max(120),
  middleName: z.string().max(120),
  lastName: z.string().max(120),
  suffix: z.string().max(120),
  sex: z.string().max(16),
});

const answersSchema = z
  .record(z.union([z.string().max(2_000), z.array(subjectAnswerSchema).max(10)]))
  .refine((answers) => Object.keys(answers).length <= 110, "Too many form answers");

const submitRequestSchema = z.object({
  serviceCode: z.string().trim().min(1),
  templateVersionId: z.string().uuid().nullable(),
  answers: answersSchema,
  documents: z
    .array(
      z.object({
        requirementName: z.string().min(1),
        fileUrl: z.string().min(1),
      }),
    )
    .max(100)
    .optional(),
});

export const submitRequestFn = createServerFn({ method: "POST" })
  .validator(submitRequestSchema)
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
    const selectedService = resolvedServices[0];
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

    let definition = buildLegacyFormDefinition(selectedService);
    let templateVersionId: string | null = null;
    const bindingResult = await supabase
      .from("service_form_templates")
      .select("template_id")
      .eq("service_code", data.serviceCode)
      .maybeSingle();
    const bindingTableMissing =
      bindingResult.error?.code === "42P01" || bindingResult.error?.code === "PGRST205";
    if (bindingResult.error && !bindingTableMissing) {
      return { error: true, message: "The application form could not be verified." };
    }

    if (bindingResult.data) {
      if (!data.templateVersionId) {
        return { error: true, message: "The published application form version is required." };
      }
      const versionResult = await supabase
        .from("form_template_versions")
        .select("id, template_id, status, definition")
        .eq("id", data.templateVersionId)
        .maybeSingle();
      if (versionResult.error) {
        return { error: true, message: "The application form could not be verified." };
      }
      const version = versionResult.data;
      if (
        !version ||
        version.status !== "published" ||
        version.template_id !== bindingResult.data.template_id
      ) {
        return { error: true, message: "This application form version is not valid." };
      }
      try {
        definition = parseFormTemplateDefinition(version.definition);
      } catch {
        return { error: true, message: "The published application form is invalid." };
      }
      templateVersionId = version.id;
    } else if (data.templateVersionId) {
      return { error: true, message: "This service is not bound to that application form." };
    }

    const validation = validateTemplateAnswers(definition, data.answers);
    if (!validation.success) {
      return { error: true, message: validation.message };
    }
    const formData = flattenTemplateAnswers(definition, data.answers);

    const created = await insertRequestWithTrackingNumber(supabase, {
      applicant_id: user.id,
      request_type: data.serviceCode,
      form_data: formData,
      fees_due: Number(selectedService.fee),
      form_template_version_id: templateVersionId,
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
