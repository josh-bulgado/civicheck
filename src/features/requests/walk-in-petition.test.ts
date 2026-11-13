import { expect, it } from "vitest";
import fixture from "./fixtures/petition-walk-in-form.json";
import { parseFormTemplateDefinition } from "../forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";
import { petitionCaseForService, prepareWalkInPetition } from "./walk-in-petition";

const original = parseFormTemplateDefinition(fixture);
const petitionSubject = { ...emptySubject("Subject"), firstName: "Ana", middleName: "Santos", lastName: "Cruz", sex: "female" };
const petitionAnswers = {
  subjects: [petitionSubject], record_type: "birth", event_date: "2000-01-01", event_place: "Legazpi City, Albay",
  other_entry: "Place of birth", other_current: "Legaspi", other_correct: "Legazpi",
  mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos", father_name: "Juan S. Cruz Jr.", registered_late: "no",
};

it("keeps staff intake focused and identifies clerical correction from the service", () => {
  const selected = petitionCaseForService(original, "RA9048-CCE");
  const keys = selected.definition.sections.flatMap(s => s.fields.map(f => f.key));
  for (const key of ["registered_in_legazpi", "petitioner_relationship", "first_name_ground", "filing_fee_exemption"]) expect(keys).not.toContain(key);
  expect(keys).not.toContain("change_first_name");
  const prepared = prepareWalkInPetition(selected.definition, { ...petitionAnswers, ...selected.answers }, ["Subject"]);
  expect(prepared).toMatchObject({ error: false, serviceCode: "RA9048-CCE", formData: { correct_other: "yes", other_correct: "Legazpi" } });
});

it("uses one petition choice and rejects a changed birth year or missing corrected sex", () => {
  const selected = petitionCaseForService(original, "RA9048-CFN");
  const answers = { ...petitionAnswers, primary_petition: "change_first_name", new_first_name: "Anna", employment_status: "not_employed" };
  expect(prepareWalkInPetition(selected.definition, answers, ["Subject"])).toMatchObject({ error: false, serviceCode: "RA9048-CFN" });
  expect(prepareWalkInPetition(selected.definition, { ...answers, primary_petition: "correct_birth_day_month", corrected_birth_date: "2001-02-02" }, ["Subject"])).toMatchObject({ error: true });
  expect(prepareWalkInPetition(selected.definition, { ...answers, primary_petition: "correct_sex", corrected_sex: "" }, ["Subject"])).toMatchObject({ error: true });
  expect(prepareWalkInPetition(selected.definition, { ...answers, primary_petition: "" }, ["Subject"])).toMatchObject({ error: true });
  const keys = selected.definition.sections.flatMap(s => s.fields.map(f => f.key));
  for (const key of ["current_first_name", "change_first_name", "correct_sex", "correct_birth_day_month", "correct_other"]) expect(keys).not.toContain(key);
});

it.each(["marriage", "death"])("records a %s clerical petition without birth details or autofilled names", record_type => {
  const selected = petitionCaseForService(original, "RA9048-CCE");
  const answers = { ...petitionAnswers, ...selected.answers, record_type,
    subjects: [{ ...petitionSubject, sex: record_type === "marriage" ? "" : "female" }],
    wife_first_name: "Elena", wife_middle_name: "N/A", wife_last_name: "Reyes",
    registered_late: "yes", registered_late_when: "Estimated: 2001",
  };
  const prepared = prepareWalkInPetition(selected.definition, answers, ["Subject"]);
  expect(prepared).toMatchObject({error:false, serviceCode:"RA9048-CCE", formData:{record_type, registered_late_when:"Estimated: 2001"}});
  if (prepared.error) return;
  expect(prepared.formData).not.toHaveProperty("mother_first_name");
  expect(prepared.formData).not.toHaveProperty("father_name");
  if (record_type === "marriage") expect(prepared.formData.wife_first_name).toBe("Elena");
  else expect(prepared.formData).not.toHaveProperty("wife_first_name");
  expect(prepareWalkInPetition(selected.definition, {...answers, subjects:[emptySubject("Subject")]}, ["Subject"])).toMatchObject({error:true});
  expect(prepareWalkInPetition(selected.definition, {...answers, registered_late_when:"1999-01-01"}, ["Subject"])).toMatchObject({error:true});
});

it.each(["correct_sex", "correct_birth_day_month"])("saves the selected %s correction and recorded name", primary_petition => {
  const selected = petitionCaseForService(original, "RA9048-CFN");
  const prepared = prepareWalkInPetition(selected.definition, {
    ...petitionAnswers, primary_petition, corrected_sex:"male", corrected_birth_date:"2000-02-02",
  }, ["Subject"]);
  expect(prepared).toMatchObject({error:false, serviceCode:"RA9048-CFN", formData:{subject_first_name:"Ana", record_type:"birth", [primary_petition]:"yes"}});
  if (!prepared.error) {
    expect(prepared.formData.change_first_name).toBe("no");
    expect(prepared.formData).not.toHaveProperty(primary_petition === "correct_sex" ? "corrected_birth_date" : "corrected_sex");
  }
});
