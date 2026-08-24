import type { ServiceRequirement } from "~/features/admin/services/services.types";
import type { SubjectFields } from "~/lib/subject-fields";

export interface RequirementUploadSlot {
  key: string;
  requirement: ServiceRequirement;
  subjectRole: string | null;
  subjectName: string | null;
}

function normalizedRole(role: string | null | undefined) {
  return role?.trim().toLocaleLowerCase() ?? "";
}

export function requirementUploadKey(
  requirementId: string,
  subjectRole: string | null | undefined,
) {
  return `${requirementId}::${normalizedRole(subjectRole) || "request"}`;
}

function subjectName(subject: Pick<SubjectFields, "firstName" | "middleName" | "lastName" | "suffix">) {
  return [subject.firstName, subject.middleName, subject.lastName, subject.suffix]
    .filter(Boolean)
    .join(" ");
}

/** Expand requirement metadata into the concrete file slots an applicant sees. */
export function expandRequirementUploadSlots(
  requirements: ServiceRequirement[],
  subjects: SubjectFields[],
): RequirementUploadSlot[] {
  return requirements.flatMap<RequirementUploadSlot>((requirement) => {
    if (!requirement.requires_upload) return [];

    if (requirement.upload_scope === "each_subject") {
      return subjects.map((subject) => ({
        key: requirementUploadKey(requirement.id, subject.role),
        requirement,
        subjectRole: subject.role,
        subjectName: subjectName(subject) || null,
      }));
    }

    if (requirement.upload_scope === "specific_subject") {
      const role = requirement.subject_role;
      if (!role) return [];
      const subject = subjects.find(
        (candidate) => normalizedRole(candidate.role) === normalizedRole(role),
      );
      return [{
        key: requirementUploadKey(requirement.id, role),
        requirement,
        subjectRole: role,
        subjectName: subject ? subjectName(subject) || null : null,
      }];
    }

    return [{
      key: requirementUploadKey(requirement.id, null),
      requirement,
      subjectRole: null,
      subjectName: null,
    }];
  });
}
