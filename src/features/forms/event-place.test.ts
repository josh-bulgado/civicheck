import { describe, expect, it } from "vitest";
import { eventPlacePlaceholder, validateEventPlace } from "./event-place";
import { formTemplateDefinitionSchema } from "./form-template.types";
import { validateTemplateAnswers } from "./form-template.utils";

const fields = [
  { key: "event_place", label: "Place of birth" },
  { key: "birth_place", label: "Place of birth" },
  { key: "marriage_place", label: "Place of marriage" },
  { key: "death_place", label: "Place of death" },
  { key: "place_of_birth", label: "Place of birth" },
  { key: "place_of_marriage", label: "Place of marriage" },
  { key: "place_of_death", label: "Place of death" },
  { key: "custom_location", label: "Place where the child was born or registered" },
];

describe.each(fields)("event place: $key", (field) => {
  const textField = { ...field, type: "text" as const, required: false };
  const definition = formTemplateDefinitionSchema.parse({
    schemaVersion: 1,
    sections: [{ key: "details", step: "details", title: "Details", fields: [textField, { key: "subjects", type: "person_group", label: "Owner", required: false }] }],
  });

  it.each(["12345", "@#$", "123 / # -", " 123 "])("rejects %s in the form and on submission", (value) => {
    const message = `${field.label} can't contain only numbers or special characters.`;
    expect(validateEventPlace(textField, value)).toBe(message);
    expect(validateTemplateAnswers(definition, { [field.key]: value })).toEqual({
      success: false, message,
    });
  });

  it.each(["District 2, Legazpi City", "Santo Niño", "東京", ""])("accepts %s", (value) => {
    expect(validateEventPlace(textField, value)).toBe(true);
    expect(validateTemplateAnswers(definition, { [field.key]: value }).success).toBe(true);
  });
});

it("does not change unrelated text or select fields", () => {
  expect(validateEventPlace({ key: "reference_number", label: "Reference number", type: "text" }, "123")).toBe(true);
  expect(validateEventPlace({ key: "event_place", label: "Place of birth", type: "select" }, "123")).toBe(true);
});

it("validates multiline place fields", () => {
  expect(validateEventPlace({ key: "event_place", label: "Place of death", type: "textarea" }, "123!")).toBe(
    "Place of death can't contain only numbers or special characters.",
  );
});

it("uses the selected record for generic location examples", () => {
  const field = { key: "event_place", label: "Place of the event on the record" };
  expect(eventPlacePlaceholder(field, "birth")).toContain("Hospital/clinic");
  expect(eventPlacePlaceholder(field, "death")).toContain("Hospital/clinic");
  expect(eventPlacePlaceholder(field, "marriage")).toContain("ceremony venue");
  expect(eventPlacePlaceholder(field, "other")).toBeUndefined();
});

it("preserves court, registration-location, intended-venue, and unrelated field examples", () => {
  for (const field of [
    { key: "event_place", label: "Court that issued the decision" },
    { key: "event_place", label: "Intended place of marriage" },
    { key: "event_place", label: "Place where the child was born or registered" },
    { key: "event_date", label: "Date of birth" },
  ]) expect(eventPlacePlaceholder({ ...field, placeholder: "Existing example" }, "birth")).toBe("Existing example");
});
