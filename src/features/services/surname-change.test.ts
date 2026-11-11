import { describe, expect, it } from "vitest";
import fixture from "../forms/fixtures/ra9255-charter.json";
import { parseFormTemplateDefinition } from "../forms/form-template.utils";
import { surnameChangeCaseDefinition, surnameChangeRequirementName } from "./surname-change";
import { physicalCopyGuidance } from "./physical-copy-guidance";

const name = fixture.requirements.find(r => r.requirement_name.startsWith("Subscribed Affidavit"))!.requirement_name;
const today = "2026-11-11";
const format = (date: string) => surnameChangeRequirementName(name, "RA9255_SURNAME", date, today);

describe("surname-change affidavit wording", () => {
  it.each(["2026-11-11", "2020-11-11", "2019-11-12"])("shows only the mother/guardian instructions below age 7 (%s)", date => {
    expect(format(date)).toContain("personal appearance of the mother or legal guardian");
    expect(format(date)).not.toContain("notarized attestation");
  });
  it("keeps age 7 subject to staff verification because the Charter overlaps", () => {
    expect(format("2019-11-11")).toContain("CCRO must verify");
    expect(format("2019-11-11")).not.toContain("ages 0-7");
  });
  it.each(["2018-11-11", "2008-11-12", "2009-11-11"])("shows only the child's appearance and attestation below age 18 (%s)", date => {
    expect(format(date)).toContain("child's personal appearance and notarized attestation");
    expect(format(date)).not.toContain("signed by the child with their personal appearance");
  });
  it.each(["2008-11-11", "2000-01-01"])("shows only the adult child's signing instructions (%s)", date => {
    expect(format(date)).toContain("signed by the child with their personal appearance");
    expect(format(date)).not.toContain("mother");
  });
  it.each(["", "invalid", "2027-01-01"])("does not show every age option when the birth date is unavailable (%s)", date => {
    expect(format(date)).toContain("depend on the child's age");
    expect(format(date)).not.toContain("ages 0-7");
  });
  it("preserves original-copy instructions and unrelated requirements", () => {
    expect(physicalCopyGuidance(format("2010-01-01"))).toContain("3 original copies");
    expect(surnameChangeRequirementName(name, "LEGITIMATION", "2010-01-01", today)).toBe(name);
    expect(surnameChangeRequirementName("Admission of Paternity", "RA9255_SURNAME", "2010-01-01", today)).toBe("Admission of Paternity");
  });
});

it("removes only surname-change case helper paragraphs without changing the saved form", () => {
  const original = parseFormTemplateDefinition(fixture.definition);
  const display = surnameChangeCaseDefinition(original, "RA9255_SURNAME");
  expect(display.sections.filter(s => s.step === "case").flatMap(s => s.fields).every(f => f.helpText === undefined)).toBe(true);
  expect(display.sections.find(s => s.step === "details")).toEqual(original.sections.find(s => s.step === "details"));
  expect(original.sections[0].fields[0].helpText).toBeTruthy();
  expect(surnameChangeCaseDefinition(original, "LEGITIMATION")).toBe(original);
});
