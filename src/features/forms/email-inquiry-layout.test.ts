import { expect, it } from "vitest";
import { emailInquiryLayout } from "./email-inquiry-layout";
import { fieldsForStep, validateTemplateAnswers } from "./form-template.utils";
import type { FormTemplateDefinition } from "./form-template.types";
import { ctcWalkInCase } from "../requests/walk-in-ctc";
import { isWalkInDetailedIntake } from "../requests/walk-in-registration";

const original: FormTemplateDefinition = {
  schemaVersion: 1,
  sections: [
    { key: "case", step: "case", title: "Request", fields: [
      { key: "record_type", type: "text", label: "Record", required: true },
      { key: "event_date", type: "date", label: "Date", required: true, helpText: "Old date help", dateDirection: "past" },
      { key: "event_place", type: "text", label: "Place", required: true },
      { key: "authorization", type: "text", label: "Authorization", required: true },
    ] },
    { key: "details", step: "details", title: "Owner", fields: [
      { key: "owner", type: "text", label: "Owner", required: true },
    ] },
  ],
};

it("moves required record fields to page two without blocking page one or changing authorization", () => {
  const definition = emailInquiryLayout(original, "EMAIL_INQUIRY");
  expect(fieldsForStep(definition, "case").map((field) => field.key)).toEqual(["record_type", "authorization"]);
  expect(fieldsForStep(definition, "details").map((field) => field.key)).toEqual(["owner", "event_date", "event_place"]);
  const caseOnly = { ...definition, sections: definition.sections.filter((section) => section.step === "case") };
  const detailsOnly = { ...definition, sections: definition.sections.filter((section) => section.step === "details") };
  expect(validateTemplateAnswers(caseOnly, { record_type: "birth", authorization: "yes" }).success).toBe(true);
  expect(validateTemplateAnswers(detailsOnly, { owner: "Fictional Person" }).success).toBe(false);
  expect(validateTemplateAnswers(detailsOnly, { owner: "Fictional Person", event_date: "2000-01-01", event_place: "Legazpi City" }).success).toBe(true);
  const [date, place] = fieldsForStep(definition, "details").slice(1);
  expect(date.helpText).toBeUndefined();
  expect(date.labelByAnswer?.labels).toEqual({ birth: "DoB", death: "DoD", marriage: "DoM" });
  expect(place.labelByAnswer?.labels).toEqual({ birth: "PoB", death: "PoD", marriage: "PoM" });
  expect(emailInquiryLayout(definition, "EMAIL_INQUIRY")).toEqual(definition);
  expect(emailInquiryLayout(original, "OTHER_CERT")).toBe(original);
  expect(original.sections[0].fields[1].helpText).toBe("Old date help");
});

it("places Registry Number after the inquiry and owner questions, before notes", () => {
  const fields = [
    { key: "record_type", type: "text" as const, label: "Record", required: true },
    { key: "reference_number", type: "text" as const, label: "Registry Number", required: false },
    { key: "what_to_verify", type: "textarea" as const, label: "Inquiry", required: true },
    { key: "is_record_owner", type: "text" as const, label: "Owner", required: true, helpText: "Authorization is needed." },
    { key: "additional_notes", type: "textarea" as const, label: "Notes", required: false },
  ];
  const source = { ...original, sections: [{ ...original.sections[0], fields }, original.sections[1]] };
  const result = emailInquiryLayout(source, "EMAIL_INQUIRY");
  expect(fieldsForStep(result, "case").map((field) => field.key)).toEqual([
    "record_type", "what_to_verify", "is_record_owner", "reference_number", "additional_notes",
  ]);
  expect(fieldsForStep(result, "case").find((field) => field.key === "is_record_owner")?.helpText)
    .toBe("Authorization is needed.");
  expect(emailInquiryLayout(result, "EMAIL_INQUIRY")).toEqual(result);
});

it("shows the owner's section and record fields before the requester, like CTC", () => {
  const source: FormTemplateDefinition = {
    ...original,
    sections: [original.sections[0],
      { key: "requester", step: "details", title: "Requester", fields: [
        { key: "requester_first_name", type: "text", label: "First Name", required: true },
      ] },
      { key: "owner", step: "details", title: "Owner", fields: [
        { key: "person", type: "person_group", label: "Owner", required: true },
      ] },
    ],
  };
  const result = emailInquiryLayout(source, "EMAIL_INQUIRY");
  const details = result.sections.filter((section) => section.step === "details");
  expect(details.map((section) => section.key)).toEqual(["owner", "requester"]);
  expect(details[0].fields.map((field) => field.key)).toEqual(["person", "event_date", "event_place"]);
  expect(details[1].fields).toEqual(source.sections[1].fields);
  const walkIn = ctcWalkInCase(source, "EMAIL_INQUIRY");
  expect(isWalkInDetailedIntake("EMAIL_INQUIRY")).toBe(true);
  expect(walkIn.definition.sections.filter((section) => section.step === "details")
    .map((section) => section.key)).toEqual(["owner", "requester"]);
  expect(emailInquiryLayout(result, "EMAIL_INQUIRY")).toEqual(result);
});
