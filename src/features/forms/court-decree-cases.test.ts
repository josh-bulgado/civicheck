import { describe, expect, it } from "vitest";
import courtForm from "../requests/fixtures/court-decree-walk-in-form.json";
import { courtDecreeRoles, courtRecordLayout } from "./court-decree";
import {
  flattenTemplateAnswers,
  canonicalizeTemplateAnswers,
  parseFormTemplateDefinition,
  resolveCaseSelectorServiceCode,
  validateCaseSelectorAnswers,
  validateTemplateAnswers,
} from "./form-template.utils";

const definition = parseFormTemplateDefinition(courtForm);

describe("court decree cases", () => {
  const person = (role: string) => ({ role, firstName: "Ana", middleName: "Santos", lastName: "Cruz", suffix: "", sex: role === "Wife" ? "female" : "male" });

  it.each(["annulment_nullity", "foreign_decree"])("requires both spouses and marriage details for %s", (court_decree_type) => {
    const answers = {
      court_decree_type, record_type: "marriage", issued_by_rtc_legazpi: "yes",
      subjects: [person("Husband"), person("Wife")], marriage_date: "2020-01-01", marriage_place: "Legazpi City, Albay",
    };
    expect(validateTemplateAnswers(definition, answers)).toEqual({ success: true });
    for (const key of ["marriage_date", "marriage_place"]) {
      expect(validateTemplateAnswers(definition, { ...answers, [key]: "" }).success).toBe(false);
    }
    expect(validateTemplateAnswers(definition, { ...answers, subjects: [person("Husband")] }).success).toBe(false);
    expect(courtDecreeRoles("COURT-FOREIGN-ADOPTION", answers, ["Subject"])).toEqual(["Husband", "Wife"]);
  });

  it("requires birth details and keeps registry number optional for adoption", () => {
    const answers = { court_decree_type: "adoption", issued_by_rtc_legazpi: "yes", subjects: [person("Subject")], birth_date: "2000-01-01", birth_place: "Legazpi City, Albay" };
    expect(validateTemplateAnswers(definition, answers)).toEqual({ success: true });
    for (const key of ["birth_date", "birth_place"]) expect(validateTemplateAnswers(definition, { ...answers, [key]: "" }).success).toBe(false);
    expect(validateTemplateAnswers(definition, { ...answers, birth_date: "2999-01-01" }).success).toBe(false);
    const fields = courtRecordLayout(definition, answers).sections.flatMap((section) => section.fields);
    expect(fields.some((field) => field.key === "marriage_date")).toBe(false);
    expect(fields.find((field) => field.key === "reference_number")?.required).toBe(false);
  });

  it("requires a foreign-decree record choice and drops stale details from the other record type", () => {
    expect(validateCaseSelectorAnswers(definition, { court_decree_type: "foreign_decree" }).success).toBe(false);
    const answers = { court_decree_type: "foreign_decree", record_type: "marriage", marriage_date: "2020-01-01", birth_date: "2000-01-01", birth_place: "Old record" };
    expect(canonicalizeTemplateAnswers(definition, answers)).not.toHaveProperty("birth_date");
    expect(flattenTemplateAnswers(definition, answers)).not.toHaveProperty("birth_place");
    expect(flattenTemplateAnswers(definition, answers).marriage_date).toBe("2020-01-01");
  });
  it.each(["adoption", "foreign_decree"])("accepts %s names without sex", (court_decree_type) => {
    const answers = {
      court_decree_type, record_type: "birth", issued_by_rtc_legazpi: "yes",
      birth_date: "2000-01-01", birth_place: "Legazpi City, Albay",
      subjects: [{ role: "Subject", firstName: "Ana", middleName: "Santos", lastName: "Cruz", suffix: "", sex: "" }],
    };
    expect(validateTemplateAnswers(definition, answers)).toEqual({ success: true });
    expect(validateTemplateAnswers(definition, { ...answers, court_decree_type: "annulment_nullity" })).toEqual({
      success: false, message: expect.stringContaining("both spouses"),
    });
  });
  it("shows three distinct choices", () => {
    expect(definition.caseSelector?.questions[0].options.map((option) => option.value))
      .toEqual(["adoption", "foreign_decree", "annulment_nullity"]);
  });

  it.each([
    ["adoption", "COURT-FOREIGN-ADOPTION"],
    ["foreign_decree", "COURT-FOREIGN-ADOPTION"],
    ["annulment_nullity", "COURT-ANNULMENT"],
  ])("routes and saves %s separately", (court_decree_type, serviceCode) => {
    const answers = { court_decree_type, record_type: "birth" };
    expect(validateCaseSelectorAnswers(definition, answers)).toEqual({ success: true, serviceCode });
    expect(flattenTemplateAnswers(definition, answers).court_decree_type).toBe(court_decree_type);
  });

  it("rejects the removed legal-separation choice", () => {
    const answers = { court_decree_type: "legal_separation" };
    expect(resolveCaseSelectorServiceCode(definition, answers)).toBeNull();
    expect(validateCaseSelectorAnswers(definition, answers)).toEqual({
      success: false,
      message: expect.stringContaining("invalid selection"),
    });
  });

  it("requires an explicit case choice", () => {
    expect(validateCaseSelectorAnswers(definition, {}).success).toBe(false);
  });
});
