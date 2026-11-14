import { ctcDetailsLayout } from "~/features/apply/ctc-layout";
import { emailInquiryLayout } from "~/features/forms/email-inquiry-layout";
import type { FormTemplateDefinition, TemplateAnswers } from "~/features/forms/form-template.types";
import { staffFormDefinition } from "~/features/forms/staff-copy";
import { birthCaseForService, prepareWalkInBirth } from "./walk-in-birth";
import { prepareWalkInSupplemental } from "./walk-in-supplemental";

export function ctcWalkInCase(definition: FormTemplateDefinition, serviceCode: string) {
  const selected = birthCaseForService(emailInquiryLayout(definition, serviceCode), serviceCode);
  return { ...selected, definition: staffFormDefinition(ctcDetailsLayout(selected.definition, true)) };
}

export function prepareWalkInCtc(definition: FormTemplateDefinition, answers: TemplateAnswers, roles: string[]) {
  return answers.record_type === "marriage"
    ? prepareWalkInSupplemental(definition, answers, roles)
    : prepareWalkInBirth(definition, answers, roles);
}
