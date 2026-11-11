import { expect, it } from "vitest";
import fixture from "../forms/fixtures/ra9255-charter.json";
import { fieldsForStep, parseFormTemplateDefinition } from "../forms/form-template.utils";
import { isRequirementApplicable } from "../services/service-utils";
import { walkInCaseForService } from "./walk-in-legitimation";
import { isWalkInDetailedIntake } from "./walk-in-registration";
import type { ServiceRequirement } from "../admin/services/services.types";

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
});
