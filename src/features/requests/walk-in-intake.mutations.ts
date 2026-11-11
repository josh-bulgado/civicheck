import { createServerFn } from "@tanstack/react-start";
import { INVALID_PERSON_NAME, validatePersonName } from "~/lib/person-name";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { flattenSubjects, type SubjectFields } from "~/lib/subject-fields";
import { requireActiveSession } from "~/server/auth";
import { clampCopies, totalFee } from "~/features/services/service-utils";
import { loadServiceCatalogue } from "~/features/services/services.catalogue";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import { prepareWalkInBirth } from "./walk-in-birth";
import { isWalkInPetition, prepareWalkInPetition } from "./walk-in-petition";
import { walkInCaseForService } from "./walk-in-legitimation";
import { prepareWalkInCourtDecree } from "./walk-in-court-decree";
import { prepareWalkInSupplemental } from "./walk-in-supplemental";
import { isWalkInCourtDecree, isWalkInDetailedIntake } from "./walk-in-registration";

export const encodeWalkInFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      serviceCode: string;
      subjects: SubjectFields[];
      purpose?: string;
      fatherName?: string;
      contactNumber?: string;
      /** Only honoured for per-copy services; ignored for everything else. */
      copies?: number;
      answers?: TemplateAnswers;
      templateVersionId?: string | null;
      physicalDocumentsConfirmed?: boolean;
      petitionAuthorityConfirmed?: boolean;
      coupleAppearanceConfirmed?: boolean;
      personalAppearanceConfirmed?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:encode_walkin",
    );

    let subjects = data.subjects.map((subject) => ({
      ...subject,
      firstName: subject.firstName.trim(),
      lastName: subject.lastName.trim(),
    }));
    if (subjects.length === 0 || subjects.some((s) => !s.firstName || !s.lastName)) {
      return { error: true, message: "Enter each person's first and last name." };
    }
    if (subjects.some((subject) =>
      [subject.firstName, subject.middleName, subject.lastName].some(
        (part) => validatePersonName(part ?? "") !== true,
      ),
    )) {
      return { error: true, message: INVALID_PERSON_NAME };
    }

    const { data: service, error: serviceError } = await supabase
      .from("services_registry")
      .select("service_code, fee, fee_per_copy, department_id")
      .eq("service_code", data.serviceCode)
      .maybeSingle();

    if (serviceError) return { error: true, message: serviceError.message };
    if (!service) return { error: true, message: "Pick a valid service." };
    if (
      isDepartmentScopedRole(role) &&
      (!departmentId || service.department_id !== departmentId)
    ) {
      return { error: true, message: "Pick a service assigned to your department." };
    }

    const copies = service.fee_per_copy ? clampCopies(data.copies ?? 1) : 1;
    const isCtc = service.service_code.startsWith("CTC-") || service.service_code === "CTC_ISSUANCE";
    const fatherName = isCtc ? data.fatherName?.trim() || "" : "";
    if (fatherName.length > 240 || validatePersonName(fatherName) !== true) {
      return { error: true, message: "Enter a valid father's full name (240 characters or fewer)." };
    }
    let registrationFormData: Record<string, string> | null = null;
    let templateVersionId: string | null = null;
    if (isWalkInDetailedIntake(service.service_code)) {
      if (isWalkInPetition(service.service_code) && data.petitionAuthorityConfirmed !== true) {
        return { error: true, message: "Confirm that the petitioner's identity and authority to file were checked." };
      }
      if (service.service_code === "RA9255_SURNAME" && data.personalAppearanceConfirmed !== true) {
        return { error: true, message: "Confirm the required personal appearance, signatures, and attestation for the child's age before encoding." };
      }
      if (service.service_code === "SUPPLEMENTAL_REPORT" && data.personalAppearanceConfirmed !== true) {
        return { error: true, message: "Confirm the applicant's personal appearance before encoding." };
      }
      if (service.service_code === "LEGITIMATION" && data.coupleAppearanceConfirmed !== true) {
        return { error: true, message: "Confirm that both parents personally appeared before encoding." };
      }
      if (data.physicalDocumentsConfirmed !== true) {
        return { error: true, message: "Confirm that the physical documents are complete and acceptable before encoding." };
      }
      const catalogue = await loadServiceCatalogue();
      const template = catalogue.formTemplatesByService.get(service.service_code);
      const registryService = catalogue.servicesByCode.get(service.service_code);
      if (!template || !registryService || !data.answers || !template.versionId) {
        return { error: true, message: "Reload the page and complete the registration form." };
      }
      const { data: active, error: activeError } = await supabase.from("form_templates")
        .select("active_version_id").eq("id", template.templateId).single();
      if (activeError || active.active_version_id !== template.versionId || data.templateVersionId !== template.versionId) {
        return { error: true, message: "The registration form has changed. Reload the page and review your answers." };
      }
      const selectedCase = walkInCaseForService(template.definition, service.service_code);
      const prepare = service.service_code === "SUPPLEMENTAL_REPORT" ? prepareWalkInSupplemental
        : isWalkInCourtDecree(service.service_code) ? prepareWalkInCourtDecree : prepareWalkInBirth;
      const prepared = (isWalkInPetition(service.service_code) ? prepareWalkInPetition : prepare)(selectedCase.definition, { ...data.answers, ...selectedCase.answers }, registryService.party_roles?.length ? registryService.party_roles : ["Subject"]);
      if (prepared.error) return prepared;
      if (prepared.serviceCode && prepared.serviceCode !== service.service_code) {
        return { error: true, message: "The selected service does not match the registration answers." };
      }
      subjects = prepared.subjects;
      registrationFormData = prepared.formData;
      templateVersionId = template.versionId;
    }

    const created = await insertRequestWithTrackingNumber(supabase, {
      applicant_id: null,
      request_type: service.service_code,
      fees_due: totalFee(service.fee, copies, service.fee_per_copy),
      copies,
      ...(templateVersionId ? { form_template_version_id: templateVersionId } : {}),
      ...(templateVersionId ? { status: "processing", walk_in_accepted_by: user.id } : {}),
      form_data: {
        ...(registrationFormData ?? {
          ...flattenSubjects(subjects),
          purpose: data.purpose?.trim() || null,
          contact_number: data.contactNumber?.trim() || null,
          ...(isCtc ? { father_name: fatherName || null } : {}),
        }),
        encoded_by: user.id,
        intake_channel: "walk_in",
        ...(isWalkInPetition(service.service_code) ? { petition_authority_confirmed: "true", physical_documents_confirmed: "true" } : {}),
        ...(service.service_code === "SUPPLEMENTAL_REPORT" ? { personal_appearance_confirmed: "true" } : {}),
        ...(service.service_code === "LEGITIMATION" ? { couple_appearance_confirmed: "true" } : {}),
        ...(service.service_code === "RA9255_SURNAME" ? { personal_appearance_confirmed: "true" } : {}),
      },
    });

    if (created.error) return { error: true, message: created.message };

    if (!templateVersionId) {
      const { error: logError } = await supabase.from("application_logs").insert({
      request_id: created.requestId,
      performed_by_profile_id: user.id,
      action_status: "submitted",
      remarks: "Walk-in encoded by department staff.",
    });
      if (logError) console.error("Failed to write walk-in audit log", logError);
    }

    return {
      error: false,
      requestId: created.requestId,
      trackingNumber: created.trackingNumber,
      applicantName: `${subjects[0].firstName} ${subjects[0].lastName}`,
      status: templateVersionId ? "processing" as const : "submitted" as const,
    };
  });
