import { applicantCopy } from "./applicant-copy";
import type { AnswerNotice, FormFieldDefinition, FormTemplateDefinition } from "./form-template.types";

const STAFF_COPY: Record<string, string> = {
  "What do you need?": "Endorsement type",
  "What do you need to register?": "Record to register",
  "Which record is it for?": "Record type",
  "Which record does it concern?": "Record type",
  "Which record do you want to verify?": "Record to verify",
  "What would you like CCRO to verify?": "Information to verify",
  "Your details": "Applicant's information",
  "Your role": "Applicant's role",
  "Your relationship to the child": "Applicant's relationship to the child",
  "Your relationship to the person named on the record": "Applicant's relationship to the document owner",
  "Your answers help us select the right service.": "These answers determine the appropriate service.",
  "Your answers help us select the correct service, fee, process, and requirements.": "These answers determine the service, fee, process, and requirements.",
  "Are you currently employed?": "Is the applicant currently employed?",
  "Are you the bride or groom?": "Applicant's role",
  "Are you the husband or wife?": "Applicant's role",
  "Are you the person named on the record?": "Is the applicant the document owner?",
  "What does your petition cover?": "Petition scope",
  "Do you want to change the first name?": "Change of first name requested?",
  "Do you want to correct another clerical or typographical error?": "Another clerical or typographical correction requested?",
  "Do you want to correct the day or month of birth?": "Correction of birth day or month requested?",
  "Do you want to correct the sex on the record?": "Correction of sex on the record requested?",
  "New first name you want": "Requested first name",
  "Why do you want to change the first name?": "Reason for the requested first-name change",
  "Do you have a Dowry Agreement, Marriage Settlement, or Prenuptial Agreement to attach?": "Dowry Agreement, Marriage Settlement, or Prenuptial Agreement available?",
  "Are you requesting a filing-fee exemption with a Certificate of Indigency?": "Is the applicant requesting a filing-fee exemption with a Certificate of Indigency?",
  "Is additional proof of identity applicable to your BRAP application?": "Is additional proof of identity applicable to this BRAP application?",
  "I am not sure": "Not sure",
  "I am the child (18 years old or above)": "Child (18 years old or above)",
  "I am the document owner": "Document owner",
  "I am the person named on the record": "Document owner",
  "I don't have a middle name": "No middle name",
  "I have habitually and continuously used the new name and am publicly known by it": "The applicant has habitually and continuously used the new name and is publicly known by it",
  "No, I am asking on someone else's behalf": "No, the applicant is requesting for another person",
  "No, I am self-employed or not employed": "No, the applicant is self-employed or not employed",
  "Yes, I have an employer": "Yes, the applicant has an employer",
  "Yes, I will submit a Certificate of Indigency": "Yes, the applicant will submit a Certificate of Indigency",
  "Yes, it is my record": "Yes, the applicant's record",
  "Check your copy": "Check the record copy",
  "Printed on your PSA or local civil registry copy.": "Printed on the PSA or local civil registry copy.",
  "The place of registration is printed on your PSA or local civil registry copy. You can also ask at the CCRO window.": "Check the place of registration on the PSA or local civil registry copy.",
  "If another court issued it, you also need a Certificate of Registration and Authenticity from the Local Civil Registrar where that court is located.": "If another court issued it, the applicant also needs a Certificate of Registration and Authenticity from the Local Civil Registrar where that court is located.",
  "If you are asking on someone else's behalf, an Authorization Letter from them is also needed.": "If the applicant is requesting for another person, an Authorization Letter from that person is also needed.",
  "If you are not the owner, a parent, the spouse, a son/daughter or the institution-in-charge, you must upload an Authorization Letter with an ID bearing the owner's signature.": "If the applicant is not the owner, a parent, the spouse, a son/daughter or the institution-in-charge, check the Authorization Letter and an ID bearing the owner's signature.",
};

export function staffCopy(value: string): string;
export function staffCopy(value: string | undefined): string | undefined;
export function staffCopy(value: string | undefined) {
  if (value === undefined) return undefined;
  const text = applicantCopy(value);
  if (/^I (?:checked|verified)\b/.test(text)) return text;
  return STAFF_COPY[text] ?? text
    .replace(/\bmy PSA copy\b/gi, "the PSA copy")
    .replace(/\bbefore you continue\b/gi, "before continuing")
    .replace(/\bwhen you submit\b/gi, "at submission")
    .replace(/\byou need\b/gi, "the applicant needs")
    .replace(/\byour\b/gi, match => match[0] === "Y" ? "The applicant's" : "the applicant's")
    .replace(/\bwe can only\b/gi, "CCRO can only")
    .replace(/\bwe use this date\b/gi, "This date is used")
    .replace(/\bso we can apply\b/gi, "to apply");
}

function staffNotice(notice: AnswerNotice | undefined): AnswerNotice | undefined {
  return notice ? { ...notice, title: staffCopy(notice.title), description: staffCopy(notice.description) } : undefined;
}

function staffField(field: FormFieldDefinition): FormFieldDefinition {
  return {
    ...field,
    label: staffCopy(field.label),
    helpText: staffCopy(field.helpText),
    placeholder: staffCopy(field.placeholder),
    noneLabel: staffCopy(field.noneLabel),
    options: field.options?.map(option => ({ ...option, label: staffCopy(option.label), notice: staffNotice(option.notice) })),
    labelByAnswer: field.labelByAnswer ? { ...field.labelByAnswer,
      labels: Object.fromEntries(Object.entries(field.labelByAnswer.labels).map(([key, label]) => [key, staffCopy(label)])),
    } : undefined,
  };
}

/** Changes display text only; keys, answer values, conditions, and saved forms stay intact. */
export function staffFormDefinition(definition: FormTemplateDefinition): FormTemplateDefinition {
  return {
    ...definition,
    sections: definition.sections.map(section => ({ ...section,
      title: staffCopy(section.title), description: staffCopy(section.description), fields: section.fields.map(staffField),
    })),
    derivedAnswers: definition.derivedAnswers?.map(answer => ({ ...answer, label: staffCopy(answer.label),
      bands: answer.bands.map(band => ({ ...band, label: staffCopy(band.label), notice: staffNotice(band.notice) })),
    })),
    eventTiming: definition.eventTiming ? { ...definition.eventTiming,
      title: staffCopy(definition.eventTiming.title), description: staffCopy(definition.eventTiming.description),
      ctaLabel: staffCopy(definition.eventTiming.ctaLabel),
    } : undefined,
    caseSelector: definition.caseSelector ? { ...definition.caseSelector,
      title: staffCopy(definition.caseSelector.title), description: staffCopy(definition.caseSelector.description),
      questions: definition.caseSelector.questions.map(question => ({ ...question,
        label: staffCopy(question.label), description: staffCopy(question.description),
        options: question.options.map(option => ({ ...option, label: staffCopy(option.label), notice: staffNotice(option.notice) })),
      })),
    } : undefined,
  };
}
