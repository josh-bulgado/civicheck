import { describe, expect, it } from "vitest";
import config from "./fixtures/birth-delayed-requirements.json";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { conditionRuleSchema } from "~/features/forms/form-template.types";
import { canonicalizeTemplateAnswers, parseFormTemplateDefinition, resolveCaseSelectorServiceCode } from "~/features/forms/form-template.utils";
import { isRequirementApplicable } from "./service-utils";
import { expandRequirementUploadSlots } from "./requirement-upload.utils";

const definition = parseFormTemplateDefinition(config.definition);
const requirements: ServiceRequirement[] = config.requirements.map((row) => ({
  ...row, upload_scope: "request", applies_when: row.applies_when ? conditionRuleSchema.parse(row.applies_when) : null,
}));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function checklist(age: number, program: string, marital: string, foreign: string, identity: string, outOfTown = "no") {
  const answers = canonicalizeTemplateAnswers(definition, {
    event_date: `${Number(today.slice(0,4)) - age}${today.slice(4)}`,
    program, marital, has_foreign_parent: foreign, additional_identity: identity, out_of_town: outOfTown,
  });
  const code = resolveCaseSelectorServiceCode(definition, answers)!;
  const slots = expandRequirementUploadSlots(requirements.filter((requirement) =>
    requirement.is_mandatory && isRequirementApplicable(requirement,code,answers)), []);
  return { code, names: slots.map((slot) => slot.requirement.requirement_name), ids: slots.map((slot) => slot.requirement.id) };
}

describe("delayed birth documents match the applicant's answers", () => {
  it.each([6,7,17,18,79,80])("checks every document combination at age %s", (age) => {
    for (const program of ["normal","brap"]) for (const marital of ["marital","non-marital"]) {
      for (const foreign of ["yes","no"]) for (const identity of ["yes","no"]) {
        const { code,names } = checklist(age,program,marital,foreign,identity);
        expect(code.includes("80UP")).toBe(age >= 80);
        expect(names.some((name) => name.startsWith("Marriage Certificate of Parents"))).toBe(marital === "marital");
        expect(names.some((name) => name.startsWith("Acknowledgement"))).toBe(marital === "non-marital");
        expect(names.some((name) => name.startsWith("Valid passport"))).toBe(foreign === "yes");
        expect(names.some((name) => name.startsWith("Negative Omnibus"))).toBe(program === "brap");
        expect(names.some((name) => name.startsWith("Certificate of Indigency"))).toBe(program === "brap");
        expect(names.some((name) => name.startsWith("Any additional proof"))).toBe(program === "brap" && identity === "yes");
        expect(names.filter((name) => name.includes("Disinterested"))).toHaveLength(1);
        expect(names).toHaveLength(10 + Number(foreign === "yes") + (program === "brap" ? 2 + Number(identity === "yes") : 0));
        expect(checklist(age,program,marital,foreign,identity,"yes").ids).toEqual(checklist(age,program,marital,foreign,identity).ids);
      }
    }
  });
  it("keeps the corrected fee and BRAP exemption", () => {
    expect(config.fees["DCOLB-80UP-NORMAL-NONMARITAL"]).toBe(500);
    expect(config.fees["DCOLB-0079-NORMAL-NONMARITAL"]).toBe(800);
    expect(config.fees["DCOLB-0079-NORMAL-MARITAL"]).toBe(500);
    expect(config.fees["DCOLB-0079-BRAP"]).toBe(0);
    expect(config.fees["DCOLB-80UP-BRAP"]).toBe(0);
  });
});
