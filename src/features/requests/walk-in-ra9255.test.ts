import { expect, it } from "vitest";
import fixture from "../forms/fixtures/ra9255-charter.json";
import { fieldsForStep, parseFormTemplateDefinition } from "../forms/form-template.utils";
import { isRequirementApplicable } from "../services/service-utils";
import { walkInCaseForService } from "./walk-in-legitimation";
import { isWalkInDetailedIntake } from "./walk-in-registration";
import type { ServiceRequirement } from "../admin/services/services.types";
import { surnameChangeCaseDefinition, surnameChangeSigningInstruction } from "../services/surname-change";

it("keeps only relevant walk-in questions and leaves the online R.A. 9255 form unchanged", () => {
  const online = parseFormTemplateDefinition(fixture.definition);
  const { definition } = walkInCaseForService(online, "RA9255_SURNAME");
  expect(isWalkInDetailedIntake("RA9255_SURNAME")).toBe(true);
  const fields = fieldsForStep(definition, "case");
  expect(fields.map(f => f.key)).toEqual([
    "event_date", "event_place", "reference_number", "father_on_record", "additional_notes",
  ]);
  expect(fields.find(f => f.key === "father_on_record")?.options?.map(o => o.value)).toEqual(["yes", "no"]);
  expect(fields.find(f => f.key === "reference_number")?.required).toBe(false);
  expect(fieldsForStep(definition, "details").find(f => f.key === "contact_number")?.required).toBe(false);
  expect(fieldsForStep(online, "case").some(f => f.key === "filer_relationship")).toBe(true);
  expect(fieldsForStep(online, "case").find(f => f.key === "father_on_record")?.options?.some(o => o.value === "not_sure")).toBe(true);
  const paternity = fixture.requirements.find(r => r.requirement_name.includes("Admission of Paternity"))! as ServiceRequirement;
  expect(isRequirementApplicable(paternity, "RA9255_SURNAME", { father_on_record: "no" })).toBe(true);
  expect(isRequirementApplicable(paternity, "RA9255_SURNAME", { father_on_record: "yes" })).toBe(false);
  const display = surnameChangeCaseDefinition(definition, "RA9255_SURNAME");
  expect(fieldsForStep(display, "case").filter(f => !["event_date", "event_place"].includes(f.key)).map(f => f.key)).toEqual([
    "father_on_record", "reference_number", "additional_notes",
  ]);
  expect(fieldsForStep(display, "case").every(f => !f.helpText)).toBe(true);
});

it.each([
  ["2025-01-01", "Ages 0–6"],
  ["2019-11-13", "Age 7"],
  ["2010-01-01", "Ages 8–17"],
  ["2000-01-01", "Ages 18+"],
])("uses the shared age instruction for staff checking the child's appearance (%s)", (date, label) => {
  expect(surnameChangeSigningInstruction(date, "2026-11-13")?.label).toBe(label);
});
