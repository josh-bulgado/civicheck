import { describe, expect, it } from "vitest";
import { formatFormDataValue, type DetailsSource } from "./form-data-display";

describe("submitted answer display", () => {
  it.each([
    ["party1_sex", "male", "Male"],
    ["party2_sex", "female", "Female"],
    ["gender", "male", "Male"],
    ["place_type", "hospital", "Hospital"],
    ["informant_relationship", "father", "Father"],
    ["informant_relationship", "physician_midwife", "Physician midwife"],
    ["marital", "non-marital", "Non-marital"],
    ["program", "brap", "BRAP"],
    ["has_foreign_parent", "no", "No"],
    ["out_of_town", "yes", "Yes"],
    ["additional_identity", true, "Yes"],
    ["additional_identity", false, "No"],
  ])("humanizes legacy %s answers: %s", (key, value, expected) => {
    expect(formatFormDataValue(String(key), value)).toBe(expected);
  });

  const source: DetailsSource = {
    formData: { program: "brap", marital: "marital", purpose: "copy_2" },
    fieldLabels: {},
    fieldDisplayValues: { program: "With BRAP assistance", marital: "Yes", purpose: "Certified copy for school" },
    eventDateLabel: null,
    eventPlaceLabel: null,
    referenceNumberLabel: null,
  };

  it("uses saved option labels for service-specific codes", () => {
    expect(formatFormDataValue("program", "brap", source)).toBe("With BRAP assistance");
    expect(formatFormDataValue("marital", "marital", source)).toBe("Yes");
    expect(formatFormDataValue("purpose", "copy_2", source)).toBe("Certified copy for school");
  });

  it("does not apply an outdated label to a different answer", () => {
    expect(formatFormDataValue("program", "normal", source)).toBe("Normal");
  });

  it.each([
    ["party1_name", "de la Cruz Jr."],
    ["contact_email", "ana.deLaCruz@example.com"],
    ["additional_notes", "yes"],
    ["contact_number", "09123456789"],
    ["reference_number", "ccro_2026_abC"],
    ["event_place", "Barangay de la Paz"],
  ])("preserves literal text in %s", (key, value) => {
    expect(formatFormDataValue(key, value)).toBe(value);
  });

  it("keeps dates, estimates, blank answers, and numbers readable", () => {
    expect(formatFormDataValue("event_date", "2026-10-01")).toBe("October 1, 2026");
    expect(formatFormDataValue("registered_late_when", "Estimated: 2015–2020")).toBe("Estimated: 2015–2020");
    expect(formatFormDataValue("additional_notes", "")).toBe("—");
    expect(formatFormDataValue("copies", 2)).toBe("2");
  });
});
