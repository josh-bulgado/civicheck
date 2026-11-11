import { describe, expect, it } from "vitest";
import config from "~/features/services/fixtures/birth-delayed-requirements.json";
import { canonicalizeTemplateAnswers, fieldsForStep, parseFormTemplateDefinition, resolveCaseSelectorServiceCode } from "~/features/forms/form-template.utils";
import { delayedBirthLayout } from "./delayed-birth-layout";

const original = parseFormTemplateDefinition(config.definition);
const definition = delayedBirthLayout(original, "DCOLB-0079-BRAP");

describe("delayed birth page layout", () => {
  it("moves birth fields to details while keeping the informant on the case page", () => {
    const caseKeys = fieldsForStep(definition, "case").map((field) => field.key);
    const detailKeys = fieldsForStep(definition, "details").map((field) => field.key);
    for (const key of ["event_date", "event_place"]) {
      expect(caseKeys).not.toContain(key);
      expect(detailKeys.filter((item) => item === key)).toHaveLength(1);
    }
    expect(caseKeys).toContain("informant_name");
    expect(delayedBirthLayout(original, "OTCOLB-MARITAL")).toBe(original);
  });

  it.each([["2000-01-01", "DCOLB-0079-BRAP"], ["1940-01-01", "DCOLB-80UP-BRAP"]])(
    "resolves the final service from the birth date %s",
    (event_date, code) => {
      const answers = canonicalizeTemplateAnswers(definition, {
        event_date, program: "brap", marital: "marital",
      }, "2026-11-11");
      expect(resolveCaseSelectorServiceCode(definition, answers)).toBe(code);
    },
  );

  it("updates the non-marital service and fee across the 80-year boundary", () => {
    for (const [event_date, code, fee] of [
      ["1939-11-01", "DCOLB-80UP-NORMAL-NONMARITAL", 500],
      ["1946-11-13", "DCOLB-0079-NORMAL-NONMARITAL", 800],
      ["1946-11-12", "DCOLB-80UP-NORMAL-NONMARITAL", 500],
      ["2000-01-01", "DCOLB-0079-NORMAL-NONMARITAL", 800],
    ] as const) {
      const answers = canonicalizeTemplateAnswers(definition, {
        event_date, program: "normal", marital: "non-marital", age: "0-79",
      }, "2026-11-12");
      const resolved = resolveCaseSelectorServiceCode(definition, answers);
      expect(resolved).toBe(code);
      expect(config.fees[resolved as keyof typeof config.fees]).toBe(fee);
    }
  });
});
