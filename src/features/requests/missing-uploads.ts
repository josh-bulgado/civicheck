/**
 * The documents an applicant can still upload to a request they already
 * submitted. Uploads are optional at submission, so a request can reach staff
 * without a document they then ask for; rather than send the applicant to the
 * office for it (they visit once, at release), it is added here.
 *
 * The slots are worked out the way submitRequestFn worked out the request's
 * checklist: the requirements that apply to its answers, one slot per person
 * where a document is per person. A slot already holding a file is not
 * offered: a rejected one is replaced with Resubmit instead.
 */
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { isRequirementApplicable } from "~/features/services/service-utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { subjectsFromFormData } from "~/lib/subject-fields";

export interface AddableUpload {
  requirementId: string;
  requirementName: string;
  subjectRole: string | null;
  subjectName: string | null;
  isMandatory: boolean;
}

export interface ExistingAttachment {
  requirementId: string | null;
  requirementName: string;
  subjectRole: string | null;
}

// Rows written before attachments carried requirement_id only match by name.
function nameKey(name: string, role: string | null) {
  return `${name.trim().toLowerCase()}::${role?.trim().toLowerCase() ?? ""}`;
}

export function addableUploads({
  requirements,
  serviceCode,
  partyRoles,
  formData,
  attachments,
}: {
  requirements: ServiceRequirement[];
  serviceCode: string;
  partyRoles: string[] | null | undefined;
  formData: Record<string, unknown>;
  attachments: ExistingAttachment[];
}): AddableUpload[] {
  // form_data keeps every answer under its question key, as flat text.
  const answers = Object.fromEntries(
    Object.entries(formData).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const roles = partyRoles?.length ? partyRoles : ["Subject"];
  const slots = expandRequirementUploadSlots(
    requirements.filter((requirement) =>
      isRequirementApplicable(requirement, serviceCode, answers),
    ),
    subjectsFromFormData(formData, roles),
  );

  const taken = new Set<string>();
  for (const attachment of attachments) {
    if (attachment.requirementId) {
      taken.add(requirementUploadKey(attachment.requirementId, attachment.subjectRole));
    }
    taken.add(nameKey(attachment.requirementName, attachment.subjectRole));
  }

  return slots
    .filter(
      (slot) =>
        !taken.has(slot.key) &&
        !taken.has(nameKey(slot.requirement.requirement_name, slot.subjectRole)),
    )
    .map((slot) => ({
      requirementId: slot.requirement.id,
      requirementName: slot.requirement.requirement_name,
      subjectRole: slot.subjectRole,
      subjectName: slot.subjectName,
      isMandatory: slot.requirement.is_mandatory,
    }));
}
