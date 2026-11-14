import type { FormFieldDefinition, FormTemplateDefinition } from "~/features/forms/form-template.types";
import { ACCOUNT_PARTY_ROLE, requiresMarriageAccountParty } from "~/features/apply/marriage-account-party";
import { marriageLicenseWalkInDefinition } from "./walk-in-marriage-license";
import { isWalkInCourtDecree } from "./walk-in-registration";
import { birthCaseForService } from "./walk-in-birth";
import { conditionRuleMatches } from "~/features/forms/form-template.utils";
import { isWalkInPetition, petitionCaseForService } from "./walk-in-petition";

export function walkInCaseForService(definition: FormTemplateDefinition, serviceCode: string) {
  if (serviceCode === "OTHER_CERT") {
    const motherFields: FormFieldDefinition[] = ["first", "middle", "last"].map((part) => ({
      key: `mother_${part}_name`,
      type: "text",
      label: `Mother's ${part} name`,
      required: true,
      inline: true,
      ...(part === "middle" ? { noneLabel: "No middle name" } : {}),
      visibleWhen: { field: "record_type", operator: "equals", value: "birth" },
    }));
    const fatherField: FormFieldDefinition = {
      key: "father_name", type: "text", label: "Father's Full Name", required: false,
      visibleWhen: { field: "record_type", operator: "equals", value: "birth" },
    };
    return {
      answers: {} as Record<string, string>,
      definition: {
        ...definition,
        sections: definition.sections.map((section) => ({
          ...section,
          fields: section.fields
            .filter((field) => field.key !== "father_name" && !motherFields.some((mother) => mother.key === field.key))
            .flatMap((field) => section.step === "details" && field.key === "event_place"
              ? [field, ...motherFields, fatherField] : [field]),
        })),
      },
    };
  }
  if (serviceCode === "MARRIAGE_LICENSE") return {
    answers: {} as Record<string, string>,
    definition: marriageLicenseWalkInDefinition(definition),
  };
  if (requiresMarriageAccountParty(serviceCode)) return {
    answers: {} as Record<string, string>,
    definition: {
      ...definition,
      sections: definition.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.key !== ACCOUNT_PARTY_ROLE),
      })).filter((section) => section.fields.length > 0),
    },
  };
  if (isWalkInPetition(serviceCode)) return petitionCaseForService(definition, serviceCode);
  if (serviceCode === "SUPPLEMENTAL_REPORT") {
    // The sworn affidavit already explains why the entry was omitted.
    const keys = ["record_type", "event_date", "event_place", "reference_number",
      "entry_to_supplement", "information_to_add", "subjects", "contact_number",
      "mother_first_name", "mother_middle_name", "mother_last_name", "father_name"];
    return {
      answers: {} as Record<string, string>,
      definition: {
        ...definition,
        sections: definition.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((field) => keys.includes(field.key)),
        })),
      },
    };
  }
  if (isWalkInCourtDecree(serviceCode)) {
    const question = definition.caseSelector?.questions.find((item) => item.key === "court_decree_type");
    const outcome = definition.caseSelector?.outcomes.find((item) => item.serviceCode === serviceCode);
    const options = question?.options.filter((option) => outcome && conditionRuleMatches(outcome.when, { court_decree_type: option.value }));
    const typeField: FormFieldDefinition[] = options?.length ? [{
      key: "court_decree_type", type: "select", label: "Court decree type", required: true, options,
    }] : [];
    const recordQuestion = definition.caseSelector?.questions.find((item) => item.key === "record_type");
    if (recordQuestion && serviceCode === "COURT-FOREIGN-ADOPTION") typeField.push({
      key: "record_type", type: "select", label: recordQuestion.label, required: true,
      options: recordQuestion.options,
      visibleWhen: { field: "court_decree_type", operator: "equals", value: "foreign_decree" },
    });
    return {
    answers: options?.length === 1 ? { court_decree_type: options[0].value } : {} as Record<string, string>,
    definition: {
      ...definition,
      caseSelector: undefined,
      sections: definition.sections.map((section) => ({
        ...section,
        fields: [...(section.step === "case" ? typeField : []), ...section.fields.filter((field) => !["purpose", "purpose_other"].includes(field.key))]
          .map((field) => field.key === "issued_by_rtc_legazpi" ? {
            ...field,
            options: field.options?.filter((option) => option.value !== "not_sure"),
            helpText: "Check the decision. For another issuing court, verify the Certificate of Registration and Authenticity from the Local Civil Registrar where that court is located.",
          } : field),
      })),
    },
  };
  }
  const surnameChange = serviceCode === "RA9255_SURNAME";
  if (serviceCode !== "LEGITIMATION" && !surnameChange) return birthCaseForService(definition, serviceCode);

  // Staff check eligibility from the papers; only the COLB answer changes the checklist.
  return {
    answers: {} as Record<string, string>,
    definition: {
      ...definition,
      sections: definition.sections.map((section) => ({
        ...section,
        fields: section.fields
          .filter((field) => !["free_to_marry", "filer_relationship", "purpose", "purpose_other"].includes(field.key))
          .map((field) => {
            if (surnameChange && field.key === "event_place") return {
              ...field, label: "Child's Place of Birth",
            };
            if (field.key === "marriage_place") return { ...field, required: false };
            if (field.key === "father_on_record") return {
              ...field,
              options: field.options?.filter((option) => option.value !== "not_sure"),
              ...(surnameChange ? {
                helpText: "Check the child's COLB. If the father did not acknowledge the child, check the notarized Father's Admission of Paternity (3 original copies).",
              } : {}),
            };
            return field;
          }),
      })),
    },
  };
}
