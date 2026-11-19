import { afterEach, expect, it, vi } from "vitest";
import fixture from "./fixtures/marriage-license-form.json";
import { deriveTemplateAnswers, parseFormTemplateDefinition } from "../forms/form-template.utils";
import { walkInCaseForService } from "./walk-in-legitimation";
import { prepareWalkInBirth } from "./walk-in-birth";
import { isWalkInDetailedIntake } from "./walk-in-registration";
import { emptySubject } from "~/lib/subject-fields";

afterEach(() => vi.useRealTimers());

it("asks only for the details needed for physical Marriage License intake", () => {
  const online = parseFormTemplateDefinition(fixture);
  const snapshot = JSON.stringify(online);
  const { definition } = walkInCaseForService(online, "MARRIAGE_LICENSE");
  expect(isWalkInDetailedIntake("MARRIAGE_LICENSE")).toBe(true);
  expect(definition.sections.flatMap(section => section.fields.map(field => field.key))).toEqual([
    "bride_nationality", "groom_nationality", "bride_civil_status", "groom_civil_status",
    "bride_date_of_birth", "groom_date_of_birth", "subjects", "contact_number",
  ]);
  expect(JSON.stringify(online)).toBe(snapshot);
  expect(() => parseFormTemplateDefinition(definition)).not.toThrow();
});

it("uses age at application for consent and advice, ignoring a supplied future wedding date", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T04:00:00Z"));
  const online = parseFormTemplateDefinition(fixture);
  const { definition } = walkInCaseForService(online, "MARRIAGE_LICENSE");
  const answers = { bride_date_of_birth: "2005-11-30", groom_date_of_birth: "2002-11-01", event_date: "2026-12-30" };
  expect(deriveTemplateAnswers(definition, answers)).toMatchObject({ bride_age_bracket: "18_20", groom_age_bracket: "21_24" });
  expect(deriveTemplateAnswers(online, answers)).toMatchObject({ bride_age_bracket: "21_24", groom_age_bracket: "21_24" });
});

it("accepts the checked paper details and excludes irrelevant online answers", () => {
  const { definition } = walkInCaseForService(parseFormTemplateDefinition(fixture), "MARRIAGE_LICENSE");
  const subjects = ["Bride", "Groom"].map(role => ({ ...emptySubject(role), firstName: "Ana", middleName: "", lastName: "Cruz", noMiddleName: true }));
  const result = prepareWalkInBirth(definition, {
    bride_date_of_birth: "1990-01-01", groom_date_of_birth: "1988-01-01",
    bride_nationality: "filipino", groom_nationality: "foreign", bride_civil_status: "widowed", groom_civil_status: "annulled_divorced",
    subjects, account_party_role: "Bride", purpose: "unused",
  }, ["Bride", "Groom"]);
  expect(result.error).toBe(false);
  if (result.error) throw new Error(result.message);
  expect(result.formData).toMatchObject({ bride_civil_status: "widowed", groom_civil_status: "annulled_divorced", subject_middle_name: "" });
  expect(result.formData).not.toHaveProperty("account_party_role");
  expect(result.formData).not.toHaveProperty("purpose");
});
