import { describe, expect, it } from "vitest";
import fixture from "../forms/fixtures/ra9255-charter.json";
import { parseFormTemplateDefinition } from "../forms/form-template.utils";
import { surnameChangeCaseDefinition, surnameChangeRequirementName, surnameChangeRequirementDisplay } from "./surname-change";
import { physicalCopyGuidance } from "./physical-copy-guidance";

const name = fixture.requirements.find(r => r.requirement_name.startsWith("Subscribed Affidavit"))!.requirement_name;
const today = "2026-11-11";
const format = (date: string) => surnameChangeRequirementName(name, "RA9255_SURNAME", date, today);

describe("surname-change affidavit wording", () => {
  it("omits the repeated acknowledgment condition from the paternity document and upload guidance", () => {
    const savedName = "[Father did not acknowledge the child] Notarized Father's Admission of Paternity, 3 original copies";
    const displayedName = surnameChangeRequirementName(savedName, "RA9255_SURNAME", "2020-01-01", today);
    expect(displayedName).toBe("Notarized Father's Admission of Paternity, 3 original copies");
    expect(physicalCopyGuidance(displayedName)).toContain("3 original copies");
    expect(physicalCopyGuidance(displayedName)).not.toContain("Father did not acknowledge");
    expect(surnameChangeRequirementName(savedName, "LEGITIMATION", "2020-01-01", today)).toBe(savedName);
  });
  it.each(["2026-11-11", "2020-11-11", "2019-11-12"])("shows only the mother/guardian instructions below age 7 (%s)", date => {
    expect(format(date)).toContain("Mother or legal guardian signs and personally appears.");
    expect(format(date)).not.toContain("notarized attestation");
  });
  it("keeps age 7 subject to staff verification because the Charter overlaps", () => {
    expect(format("2019-11-11")).toContain("CCRO must verify");
    expect(format("2019-11-11")).not.toContain("ages 0-7");
    const display = surnameChangeRequirementDisplay(format("2019-11-11"), "RA9255_SURNAME");
    expect(display.name).toBe("Subscribed Affidavit to Use the Surname of the Father, 3 original copies");
    expect(display.ageNote).toBe("CCRO must verify who signs and personally appears.");
    expect(surnameChangeRequirementName(format("2019-11-11"), "RA9255_SURNAME", "2019-11-11", today)).toBe(format("2019-11-11"));
    expect(physicalCopyGuidance(display.name)).not.toContain("CCRO must verify");
  });
  it.each(["2018-11-11", "2008-11-12", "2009-11-11"])("shows only the child's appearance and attestation below age 18 (%s)", date => {
    expect(format(date)).toContain("The child signs and personally appears, with notarized attestation");
    expect(format(date)).not.toContain("signed by the child with their personal appearance");
  });
  it.each(["2008-11-11", "2000-01-01"])("shows only the adult child's signing instructions (%s)", date => {
    expect(format(date)).toContain("Ages 18+: The child signs and personally appears.");
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
  it.each([
    ["2020-11-11", "Ages 0–6"],
    ["2019-11-11", "Age 7"],
    ["2010-01-01", "Ages 8–17"],
    ["2000-01-01", "Ages 18+"],
  ])("separates the age label and instruction from the document title for %s", (date, label) => {
    const formatted = format(date);
    const display = surnameChangeRequirementDisplay(formatted, "RA9255_SURNAME");
    expect(display.ageLabel).toBe(label);
    expect(display.ageNote).toBeTruthy();
    expect(display.name).toBe("Subscribed Affidavit to Use the Surname of the Father, 3 original copies");
    expect(physicalCopyGuidance(display.name)).not.toContain("Age");
    expect(surnameChangeRequirementName(formatted, "RA9255_SURNAME", date, today)).toBe(formatted);
  });
});

it("removes only surname-change case helper paragraphs without changing the saved form", () => {
  const original = parseFormTemplateDefinition(fixture.definition);
  const display = surnameChangeCaseDefinition(original, "RA9255_SURNAME");
  expect(display.sections[0].fields.filter(f => !["event_date", "event_place"].includes(f.key)).map(f => f.key)).toEqual([
    "filer_relationship", "father_on_record", "reference_number", "additional_notes",
  ]);
  expect(display.sections.filter(s => s.step === "case").flatMap(s => s.fields).every(f => f.helpText === undefined)).toBe(true);
  expect(display.sections.find(s => s.step === "details")).toEqual(original.sections.find(s => s.step === "details"));
  expect(original.sections[0].fields[0].helpText).toBeTruthy();
  expect(surnameChangeCaseDefinition(original, "LEGITIMATION")).toBe(original);
});
