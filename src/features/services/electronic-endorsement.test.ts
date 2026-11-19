import { expect, it } from "vitest";
import { endorsementRequirementName } from "./electronic-endorsement";

it.each([
  ["birth", "1A"], ["death", "2A"], ["marriage", "3A"],
])("shows the correct form for %s", (recordType, form) => {
  for (const name of ["[Negative to PSA CRS] Form 1A/2A/3A, 1 copy", "[Blurred/Illegible Entries] Form 1A/ 2A/ 3A, 1 copy"]) {
    expect(endorsementRequirementName(name, "ELEC_ENDORSEMENT", recordType))
      .toBe(name.replace(/1A\/\s*2A\/\s*3A/, form));
  }
});

it("keeps the complete list before a record is selected and leaves other services alone", () => {
  const name = "Form 1A/2A/3A, 1 copy";
  expect(endorsementRequirementName(name, "ELEC_ENDORSEMENT")).toBe(name);
  expect(endorsementRequirementName(name, "OTHER_CERT", "birth")).toBe(name);
});
