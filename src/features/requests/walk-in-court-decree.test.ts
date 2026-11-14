import { expect, it } from "vitest";
import { walkInServiceChoices, prepareWalkInCourtDecree } from "./walk-in-court-decree";
import { walkInCaseForService } from "./walk-in-legitimation";
import { parseFormTemplateDefinition } from "~/features/forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";
import courtForm from "./fixtures/court-decree-walk-in-form.json";

it("offers three distinct court choices with the correct underlying service and fee", () => {
  const choices = walkInServiceChoices([
    { serviceCode:"COURT-FOREIGN-ADOPTION",name:"Foreign decree or adoption",fee:500 },
    { serviceCode:"COURT-ANNULMENT",name:"Annulment or nullity",fee:700 },
    { serviceCode:"OTHER_CERT",name:"Other Certificates",fee:100 },
  ]);
  expect(choices.map(({ serviceCode,courtDecreeType,fee }) => ({serviceCode,courtDecreeType,fee}))).toEqual([
    {serviceCode:"COURT-FOREIGN-ADOPTION",courtDecreeType:"adoption",fee:500},
    {serviceCode:"COURT-FOREIGN-ADOPTION",courtDecreeType:"foreign_decree",fee:500},
    {serviceCode:"COURT-ANNULMENT",courtDecreeType:"annulment_nullity",fee:700},
    {serviceCode:"OTHER_CERT",courtDecreeType:"",fee:100},
  ]);
  expect(new Set(choices.map((choice) => choice.value)).size).toBe(4);
});

it("records both spouses without hidden sex or wife-suffix values", () => {
  const definition = walkInCaseForService(parseFormTemplateDefinition(courtForm),"COURT-ANNULMENT").definition;
  const subjects = ["Husband","Wife"].map((role) => ({...emptySubject(role),firstName:"Ana",middleName:"Santos",lastName:"Cruz",sex:"female",suffix:"Jr."}));
  const answers = {subjects,court_decree_type:"annulment_nullity",issued_by_rtc_legazpi:"yes",marriage_date:"2020-01-01",marriage_place:"Legazpi City, Albay"};
  const result = prepareWalkInCourtDecree(definition,answers,["Husband","Wife"]);
  expect(result).toMatchObject({error:false});
  if (!result.error) {
    expect(result.formData).toMatchObject({subject_role:"Husband",party2_role:"Wife",subject_sex:"",party2_sex:"",party2_suffix:""});
  }
});
