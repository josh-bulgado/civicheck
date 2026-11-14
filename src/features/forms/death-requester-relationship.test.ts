import { describe, expect, it } from "vitest";
import { deathRequesterRelationship } from "./death-requester-relationship";
import { canonicalizeTemplateAnswers, evaluateTemplateEventTiming, validateTemplateAnswers } from "./form-template.utils";
import type { FormTemplateDefinition } from "./form-template.types";

const source: FormTemplateDefinition = {
  schemaVersion: 1,
  sections: [{ key: "case", step: "case", title: "Case details", fields: [
    { key: "additional_notes", type: "textarea", label: "Additional notes", required: false },
  ] }],
};

describe("on-time death requester relationship", () => {
  const definition = deathRequesterRelationship(source, "DEATH_ONTIME");

  it("places the optional relationship before notes and preserves other services", () => {
    expect(definition.sections[0].fields.map((field) => field.key)).toEqual([
      "requester_relationship", "requester_relationship_other", "additional_notes",
    ]);
    expect(deathRequesterRelationship(definition, "DEATH_ONTIME")).toEqual(definition);
    expect(deathRequesterRelationship(source, "BIRTH_DELAYED")).toBe(source);
    expect(validateTemplateAnswers(definition, {})).toEqual({ success: true });
  });

  it("requires a description for Other and drops stale hidden descriptions", () => {
    expect(validateTemplateAnswers(definition, { requester_relationship: "other" }).success).toBe(false);
    expect(validateTemplateAnswers(definition, {
      requester_relationship: "other", requester_relationship_other: "Neighbor",
    })).toEqual({ success: true });
    const answers = canonicalizeTemplateAnswers(definition, {
      requester_relationship: "informant", requester_relationship_other: "Neighbor",
    });
    expect(answers.requester_relationship).toBe("informant");
    expect(answers.requester_relationship_other).toBeUndefined();
  });
});

it("moves delayed death event fields to details without changing their checks", () => {
  const date = { key: "event_date", type: "date" as const, label: "Date of death", required: true, dateDirection: "past" as const };
  const place = { key: "event_place", type: "text" as const, label: "Place of death", required: true };
  const input: FormTemplateDefinition = {
    ...source,
    eventTiming: { triggerField: "event_date", windowDays: 30, mismatch: "inside_window", timezone: "Asia/Manila", behavior: "redirect_confirm", targetServiceCode: "DEATH_ONTIME", requireDocumentFirst: false, ctaLabel: "Switch", title: "Check date", description: "Delayed registration requires an older date" },
    sections: [
      { ...source.sections[0], fields: [date, place, ...source.sections[0].fields] },
      { key: "details", step: "details", title: "Details", fields: [] },
    ],
  };
  const result = deathRequesterRelationship(input, "DEATH_DELAYED");
  expect(result.sections[0].fields.map(field => field.key)).toEqual(["requester_relationship", "requester_relationship_other", "additional_notes"]);
  expect(result.sections[1].fields).toEqual([date, place]);
  expect(result.eventTiming).toEqual(input.eventTiming);
  expect(evaluateTemplateEventTiming(result, { event_date: "2026-11-14" }, "2026-11-15")?.evaluation.mismatched).toBe(true);
  expect(evaluateTemplateEventTiming(result, { event_date: "2026-10-01" }, "2026-11-15")?.evaluation.mismatched).toBe(false);
  expect(deathRequesterRelationship(result, "DEATH_DELAYED")).toEqual(result);
  expect(validateTemplateAnswers(result, { event_date: "2026-01-01", event_place: "Legazpi", requester_relationship: "other" }).success).toBe(false);
});

it.each(["DEATH_ONTIME", "DEATH_DELAYED"])("moves contact information to page 1 for %s", (serviceCode) => {
  const contact = { key: "contact_number", type: "phone" as const, label: "Contact number", required: false };
  const input: FormTemplateDefinition = {
    ...source,
    sections: [...source.sections, { key: "details", step: "details", title: "Details", fields: [contact] }],
  };
  const result = deathRequesterRelationship(input, serviceCode);
  expect(result.sections[0].fields.map(field => field.key)).toEqual([
    "requester_relationship", "requester_relationship_other", "contact_number", "additional_notes",
  ]);
  expect(result.sections[0].fields.find(field => field.key === "contact_number")).toEqual(contact);
  expect(result.sections[1].fields).toEqual([]);
  expect(deathRequesterRelationship(result, serviceCode)).toEqual(result);
});
