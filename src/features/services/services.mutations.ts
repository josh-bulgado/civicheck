import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { finalizeRequestUploadDraft } from "~/features/apply/apply-upload-drafts.server";
import { requireActiveSession } from "~/server/auth";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { isRequirementApplicable } from "~/features/services/service-utils";
import { loadServiceCatalogue, resolveServices } from "~/features/services/services.catalogue";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import type { SubjectFields } from "~/lib/subject-fields";
import { getSupabaseAdminClient } from "~/utils/supabase";
import {
  buildLegacyFormDefinition,
  deriveTemplateAnswers,
  flattenTemplateAnswers,
  parseFormTemplateDefinition,
  validateCaseSelectorAnswers,
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
  uploadDraftId: z.string().uuid().nullable(),
  answers: answersSchema,
  documents: z
    .array(
      z.object({
        requirementId: z.string().uuid(),
        requirementName: z.string().min(1),
        subjectRole: z.string().max(160).nullable(),
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

    const answerBag = deriveTemplateAnswers(definition, data.answers);
    const selectorValidation = validateCaseSelectorAnswers(
      definition,
      answerBag,
    );
    if (!selectorValidation.success) {
      return { error: true, message: selectorValidation.message };
    }
    if (
      selectorValidation.serviceCode &&
      selectorValidation.serviceCode !== data.serviceCode
    ) {
      return {
        error: true,
        message: "The selected service does not match the submitted case answers.",
      };
    }

    const validation = validateTemplateAnswers(definition, answerBag);
    if (!validation.success) {
      return { error: true, message: validation.message };
    }

    const subjects = definition.sections
      .flatMap((section) => section.fields)
      .filter((field) => field.type === "person_group")
      .flatMap((field) => {
        const value = answerBag[field.key];
        return Array.isArray(value) ? (value as SubjectFields[]) : [];
      });
    const applicableRequirements = requirements.filter((requirement) =>
      isRequirementApplicable(requirement, data.serviceCode, answerBag),
    );
    const allowedSlots = expandRequirementUploadSlots(
      applicableRequirements,
      subjects,
    );
    const requiredSlots = expandRequirementUploadSlots(
      applicableRequirements.filter((requirement) => requirement.is_mandatory),
      subjects,
    );
    const allowedKeys = new Set(allowedSlots.map((slot) => slot.key));
    const allowedSlotByKey = new Map(allowedSlots.map((slot) => [slot.key, slot]));
    const submittedKeys = (data.documents ?? []).map((document) =>
      requirementUploadKey(document.requirementId, document.subjectRole),
    );
    const submittedFileUrls = (data.documents ?? []).map(
      (document) => document.fileUrl,
    );
    const applicantPathPrefix = `${user.id}/`;
    if (
      submittedFileUrls.some((path) => !path.startsWith(applicantPathPrefix))
    ) {
      return {
        error: true,
        message: "One or more uploaded documents do not belong to this applicant.",
      };
    }

    const stagedPathPrefix = data.uploadDraftId
      ? `${user.id}/drafts/${data.uploadDraftId}/`
      : null;
    const hasStagedPaths = submittedFileUrls.some((path) =>
      path.startsWith(`${user.id}/drafts/`),
    );
    const stagedFilesByPath = new Map<
      string,
      { requirement_id: string | null; subject_role: string | null }
    >();
    if (data.uploadDraftId) {
      const { data: uploadDraft, error: uploadDraftError } = await supabase
        .from("request_upload_drafts")
        .select("id")
        .eq("id", data.uploadDraftId)
        .eq("applicant_id", user.id)
        .eq("status", "draft")
        .maybeSingle();
      if (uploadDraftError || !uploadDraft) {
        return {
          error: true,
          message: "The document upload session has expired. Add the files again.",
        };
      }

      const { data: stagedFiles, error: stagedFilesError } = await supabase
        .from("request_upload_draft_files")
        .select("storage_path, requirement_id, subject_role")
        .eq("draft_id", data.uploadDraftId);
      if (stagedFilesError) {
        return {
          error: true,
          message: "The uploaded documents could not be verified.",
        };
      }
      for (const file of stagedFiles ?? []) {
        stagedFilesByPath.set(file.storage_path, file);
      }
    } else if (hasStagedPaths) {
      return {
        error: true,
        message: "The document upload session is missing. Add the files again.",
      };
    }

    const stagedFileMismatch = (data.documents ?? []).some((document) => {
      if (!document.fileUrl.startsWith(`${user.id}/drafts/`)) return false;
      if (!stagedPathPrefix || !document.fileUrl.startsWith(stagedPathPrefix)) {
        return true;
      }
      const stagedFile = stagedFilesByPath.get(document.fileUrl);
      return (
        !stagedFile ||
        !stagedFile.requirement_id ||
        requirementUploadKey(
          stagedFile.requirement_id,
          stagedFile.subject_role,
        ) !== requirementUploadKey(document.requirementId, document.subjectRole)
      );
    });
    if (
      new Set(submittedFileUrls).size !== submittedFileUrls.length ||
      submittedKeys.some((key) => !allowedKeys.has(key)) ||
      stagedFileMismatch
    ) {
      return {
        error: true,
        message: "One or more uploaded documents do not match this application.",
      };
    }
    const uploadedKeys = new Set(submittedKeys);
    const missing = requiredSlots.filter((slot) => !uploadedKeys.has(slot.key));
    if (missing.length > 0) {
      return {
        error: true,
        message: `Missing required document(s): ${missing
          .map((slot) =>
            slot.subjectRole
              ? `${slot.requirement.requirement_name} (${slot.subjectRole})`
              : slot.requirement.requirement_name,
          )
          .join(", ")}.`,
      };
    }

    const formData = flattenTemplateAnswers(definition, answerBag);

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
        data.documents.map((doc) => {
          const key = requirementUploadKey(doc.requirementId, doc.subjectRole);
          const slot = allowedSlotByKey.get(key)!;
          return {
            request_id: requestId,
            requirement_id: slot.requirement.id,
            requirement_name: slot.requirement.requirement_name,
            subject_role: slot.subjectRole,
            file_url: doc.fileUrl,
          };
        }),
      );
      if (docsError) {
        const { error: rollbackError } = await getSupabaseAdminClient()
          .from("requests")
          .delete()
          .eq("id", requestId)
          .eq("applicant_id", user.id);
        if (!rollbackError) {
          return {
            error: true,
            message:
              "The request was not submitted because its documents could not be attached. Your uploads are still saved—try again.",
          };
        }
        documentWarning =
          "Your request was submitted, but we couldn't attach your uploaded documents. Please bring them with you to the CCRO.";
      }
    }

    if (data.uploadDraftId && !documentWarning) {
      await finalizeRequestUploadDraft({
        draftId: data.uploadDraftId,
        applicantId: user.id,
        requestId,
        submittedPaths: submittedFileUrls,
      });
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
