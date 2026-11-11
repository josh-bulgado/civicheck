import { expect, it } from "vitest";
import fixture from "../forms/fixtures/petition-charter.json";
import { parseFormTemplateDefinition } from "../forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";
import { petitionCaseForService, prepareWalkInPetition } from "./walk-in-petition";

const original = parseFormTemplateDefinition(fixture.definition);
const petitionSubject = { ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz", sex: "female" };
const petitionAnswers = {
  subjects: [petitionSubject], record_type: "birth", event_date: "2000-01-01", event_place: "Legazpi City, Albay",
  other_entry: "Place of birth", other_current: "Legaspi", other_correct: "Legazpi",
};

it("keeps staff intake focused and identifies clerical correction from the service", () => {
  const selected = petitionCaseForService(original, "RA9048-CCE");
  const keys = selected.definition.sections.flatMap(s => s.fields.map(f => f.key));
  for (const key of ["registered_in_legazpi", "petitioner_relationship", "first_name_ground", "filing_fee_exemption"]) expect(keys).not.toContain(key);
  expect(keys).not.toContain("change_first_name");
  const prepared = prepareWalkInPetition(selected.definition, { ...petitionAnswers, ...selected.answers }, ["Subject"]);
  expect(prepared).toMatchObject({ error: false, serviceCode: "RA9048-CCE", formData: { correct_other: "yes", other_correct: "Legazpi" } });
});

it("records combined corrections and rejects a changed birth year or missing corrected sex", () => {
  const selected = petitionCaseForService(original, "RA9048-CFN");
  const answers = { ...petitionAnswers, change_first_name: "yes", correct_sex: "yes", correct_birth_day_month: "yes", correct_other: "no",
    current_first_name: "Anna", new_first_name: "Ana", employment_status: "not_employed", corrected_sex: "female", corrected_birth_date: "2000-02-02" };
  expect(prepareWalkInPetition(selected.definition, answers, ["Subject"])).toMatchObject({ error: false, serviceCode: "RA9048-CFN" });
  expect(prepareWalkInPetition(selected.definition, { ...answers, corrected_birth_date: "2001-02-02" }, ["Subject"])).toMatchObject({ error: true });
  expect(prepareWalkInPetition(selected.definition, { ...answers, corrected_sex: "" }, ["Subject"])).toMatchObject({ error: true });
  expect(prepareWalkInPetition(selected.definition, { ...answers, change_first_name: "no", correct_sex: "no", correct_birth_day_month: "no", correct_other: "no" }, ["Subject"])).toMatchObject({ error: true });
});
