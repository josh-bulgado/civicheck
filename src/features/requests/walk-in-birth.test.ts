import { describe, expect, it } from "vitest";
import config from "~/features/services/fixtures/birth-delayed-requirements.json";
import {
  parseFormTemplateDefinition,
  todayKeyInTimeZone,
} from "~/features/forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";
import { birthCaseForService, isWalkInBirth, prepareWalkInBirth } from "./walk-in-birth";

const delayed = parseFormTemplateDefinition(config.definition);
const roles = ["Child", "Mother"];
const subjects = roles.map((role) => ({
  ...emptySubject(role),
  firstName: "Maria",
  middleName: "Santos",
  lastName: "Cruz",
  sex: role === "Mother" ? "female" : "male",
}));
const today = todayKeyInTimeZone();
const answers = {
  event_date: `${Number(today.slice(0, 4)) - 20}${today.slice(4)}`,
  event_place: "Barangay Gogon, Legazpi City, Albay",
  program: "normal",
  marital: "marital",
  has_foreign_parent: "no",
  out_of_town: "no",
  additional_identity: "no",
  subjects,
};

describe("birth walk-in alignment", () => {
  it("limits the full form to on-time and delayed birth services", () => {
    for (const code of [
      "OTCOLB-MARITAL",
      "OTCOLB-NONMARITAL",
      ...Object.keys(config.fees),
    ])
      expect(isWalkInBirth(code)).toBe(true);
    for (const code of ["CTC_BIRTH", "DEATH_ONTIME", "MARRIAGE_LICENSE"])
      expect(isWalkInBirth(code)).toBe(false);
  });

  it("resolves all delayed variants from birth date and case answers", () => {
    for (const age of [20, 85])
      for (const program of ["normal", "brap"])
        for (const marital of ["marital", "non-marital"]) {
          const result = prepareWalkInBirth(
            delayed,
            {
              ...answers,
              event_date: `${Number(today.slice(0, 4)) - age}${today.slice(4)}`,
              program,
              marital,
            },
            roles,
          );
          expect(result.error).toBe(false);
          if (result.error) throw new Error(result.message);
          expect(result.serviceCode).toBe(
            `DCOLB-${age >= 80 ? "80UP" : "0079"}-${program === "brap" ? "BRAP" : `NORMAL-${marital === "marital" ? "MARITAL" : "NONMARITAL"}`}`,
          );
          expect(result.formData.subject_first_name).toBe("Maria");
          expect(result.formData.party2_role).toBe("Mother");
        }
  });

  it("rejects missing birth details, invalid names, missing sex, and missing people", () => {
    for (const patch of [
      { event_date: "" },
      { event_place: "" },
      { program: "" },
      { subjects: [] },
      { subjects: [subjects[0]] },
      { subjects: [{ ...subjects[0], firstName: "123" }, subjects[1]] },
      { subjects: [{ ...subjects[0], sex: "" }, subjects[1]] },
      { subjects: [{ ...subjects[0], middleName: "" }, subjects[1]] },
    ])
      expect(
        prepareWalkInBirth(delayed, { ...answers, ...patch }, roles).error,
      ).toBe(true);
  });

  it("accepts an explicit no-middle-name answer and prunes hidden and unknown values", () => {
    const result = prepareWalkInBirth(
      delayed,
      {
        ...answers,
        subjects: [
          { ...subjects[0], middleName: "", noMiddleName: true },
          subjects[1],
        ],
        encoded_by: "forged",
        age: "80+",
      },
      roles,
    );
    expect(result.error).toBe(false);
    if (result.error) throw new Error(result.message);
    expect(result.formData.subject_middle_name).toBe("");
    expect(result.formData.additional_identity).toBeUndefined();
    expect(result.formData.encoded_by).toBeUndefined();
    expect(result.serviceCode).toBe("DCOLB-0079-NORMAL-MARITAL");
  });

  it("keeps birth date timing validation on both registration tracks", () => {
    expect(
      prepareWalkInBirth(delayed, { ...answers, event_date: today }, roles)
        .error,
    ).toBe(true);
    const ontime = {
      ...delayed,
      eventTiming: {
        ...delayed.eventTiming!,
        mismatch: "outside_window" as const,
      },
    };
    expect(prepareWalkInBirth(ontime, answers, roles).error).toBe(true);
    expect(
      prepareWalkInBirth(ontime, { ...answers, event_date: today }, roles)
        .error,
    ).toBe(false);
  });
});

it("uses each selected delayed service without repeating service selection", () => {
  for (const code of Object.keys(config.fees)) {
    const selected = birthCaseForService(delayed, code);
    const result = prepareWalkInBirth(selected.definition, {
      ...answers,
      event_date: `${Number(today.slice(0, 4)) - (code.includes("80UP") ? 85 : 20)}${today.slice(4)}`,
      ...selected.answers,
    }, roles);
    expect(result.error).toBe(false);
    if (result.error) throw new Error(result.message);
    expect(result.serviceCode).toBe(code);
    if (code.includes("BRAP")) expect(result.formData.marital).toBeUndefined();
  }
});
