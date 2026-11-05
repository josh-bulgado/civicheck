import { describe, expect, it } from "vitest";
import birthFixture from "~/features/services/fixtures/birth-delayed-requirements.json";
import { requestFieldDisplayOf, requestFieldLabelsOf } from "./request-field-labels";

describe("saved request display labels", () => {
  it("reads the selected options, case choices, and derived answers from the saved form", () => {
    const result = requestFieldDisplayOf({
      form_template_versions: { definition: birthFixture.definition },
      form_data: {
        program: "brap", marital: "non-marital", age: "80+", place_type: "hospital",
        informant_relationship: "physician_midwife", has_foreign_parent: "no",
      },
    });
    expect(result.fieldDisplayValues).toEqual({
      program: "With BRAP assistance", marital: "No", age: "80 years old and above",
      place_type: "Hospital / Clinic", informant_relationship: "Physician / Midwife", has_foreign_parent: "No",
    });
    expect(result.fieldLabels.place_type).toBe("Where did the birth take place?");
  });

  it.each(["Death certificate", "Marriage certificate"])("supports custom choices for %s services", (title) => {
    const definition = {
      schemaVersion: 1,
      sections: [{ key: "details", step: "details", title, fields: [
        { key: "subjects", type: "person_group", label: "Persons named on the record" },
        { key: "purpose", type: "select", label: "Purpose", options: [{ value: "cert_copy", label: "Certified true copy" }] },
        { key: "country", type: "select", label: "Country", countrySelect: true, options: [{ value: "other", label: "Other country" }] },
      ] }],
    };
    const result = requestFieldDisplayOf({
      form_template_versions: [{ definition }], form_data: { purpose: "cert_copy", country: "PH" },
    });
    expect(result.fieldDisplayValues).toEqual({ purpose: "Certified true copy", country: "Philippines" });
  });

  it("leaves unknown and free-text answers unchanged", () => {
    const result = requestFieldDisplayOf({
      form_template_versions: { definition: birthFixture.definition },
      form_data: { program: "retired_option", contact_number: "09123456789", informant_name: "de la Cruz" },
    });
    expect(result.fieldDisplayValues).toEqual({});
  });

  it.each([null, undefined, { definition: {} }, []])("safely handles missing or invalid legacy templates", (embed) => {
    expect(requestFieldDisplayOf({ form_template_versions: embed })).toEqual({ fieldLabels: {}, fieldDisplayValues: {} });
  });

  it("keeps the field-label-only API compatible", () => {
    const row = { form_template_versions: { definition: birthFixture.definition } };
    expect(requestFieldLabelsOf(row)).toEqual(requestFieldDisplayOf(row).fieldLabels);
  });
});
