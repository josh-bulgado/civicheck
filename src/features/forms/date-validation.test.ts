import { describe, expect, it } from "vitest";
import { registrationEventDate, validateDateAnswer } from "./date-validation";
import { formTemplateDefinitionSchema } from "./form-template.types";
import { canonicalizeTemplateAnswers, validateTemplateAnswers } from "./form-template.utils";
import marriageLicense from "../requests/fixtures/marriage-license-form.json";

const definition = formTemplateDefinitionSchema.parse({
  schemaVersion: 1,
  sections: [{ key: "details", title: "Details", step: "details", fields: [
    { key: "subjects", type: "person_group", label: "Owner" },
    { key: "event_date", type: "date", label: "Event date", dateDirection: "past" },
    { key: "death_date", type: "date", label: "Date of death", dateDirection: "past" },
    { key: "marriage_date", type: "date", label: "Date of marriage", dateDirection: "past" },
    { key: "registered_late_when", type: "date", label: "Registration date", dateDirection: "past", allowEstimate: true },
    { key: "record_type", type: "select", label: "Record", options: [
      { value: "death", label: "Death" }, { value: "marriage", label: "Marriage" },
    ] },
  ] }],
});
const registration = definition.sections[0].fields[4];

describe("shared date validation", () => {
  it.each(["death", "marriage"])("checks registration against the %s date in form and server", (record_type) => {
    const answers = { record_type, [`${record_type}_date`]: "2026-10-20", registered_late_when: "2026-10-19" };
    expect(validateDateAnswer(registration, answers.registered_late_when, answers, "2026-11-11")).toBe("The registration date cannot be before the event date.");
    expect(validateTemplateAnswers(definition, answers, "2026-11-11").success).toBe(false);
    expect(validateTemplateAnswers(definition, { ...answers, registered_late_when: "2026-10-20" }, "2026-11-11")).toEqual({ success: true });
    expect(validateTemplateAnswers(definition, { ...answers, registered_late_when: "Estimated: 2025" }, "2026-11-11").success).toBe(false);
  });

  it("uses the generic event date for Email Inquiry and the other-record date for CTC", () => {
    expect(registrationEventDate({ record_type: "marriage", event_date: "2020-01-01" })).toBe("2020-01-01");
    expect(registrationEventDate({ record_type: "other", record_date: "2019-01-01" })).toBe("2019-01-01");
  });

  it("rejects future completed events and malformed calendar dates in form and server", () => {
    const field = definition.sections[0].fields[1];
    for (const value of ["2026-11-12", "2026-02-30"]) {
      expect(validateDateAnswer(field, value, {}, "2026-11-11")).not.toBe(true);
      expect(validateTemplateAnswers(definition, { event_date: value }, "2026-11-11").success).toBe(false);
    }
    expect(validateDateAnswer(field, "2026-11-11", {}, "2026-11-11")).toBe(true);
  });

  it("calculates marriage ages at the intended marriage date, independent of today's date", () => {
    const form = formTemplateDefinitionSchema.parse(marriageLicense);
    const answers = { bride_date_of_birth: "2006-12-01", groom_date_of_birth: "2006-12-01", event_date: "2027-12-01" };
    for (const today of ["2026-11-11", "2027-01-01"]) {
      expect(canonicalizeTemplateAnswers(form, answers, today)).toMatchObject({ bride_age_bracket: "21_24", groom_age_bracket: "21_24" });
    }
    expect(canonicalizeTemplateAnswers(form, { ...answers, event_date: "2027-11-30" }, "2026-11-11")).toMatchObject({ bride_age_bracket: "18_20", groom_age_bracket: "18_20" });
  });
});
