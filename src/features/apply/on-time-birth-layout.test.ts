import { describe, expect, it } from "vitest";
import config from "~/features/services/fixtures/birth-delayed-requirements.json";
import { evaluateTemplateEventTiming, fieldsForStep, parseFormTemplateDefinition } from "~/features/forms/form-template.utils";
import { onTimeBirthLayout } from "./on-time-birth-layout";

describe("on-time birth page layout", () => {
  const original = parseFormTemplateDefinition(config.definition);

  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("moves birth controls and preserves their rules for %s", (code) => {
    const definition = onTimeBirthLayout(original, code);
    const caseFields = fieldsForStep(definition, "case");
    const detailsFields = fieldsForStep(definition, "details");
    for (const key of ["event_date", "event_place"]) {
      expect(caseFields.some((field) => field.key === key)).toBe(false);
      expect(detailsFields.filter((field) => field.key === key)).toHaveLength(1);
      const source = fieldsForStep(original, "case").find((field) => field.key === key)!;
      expect(detailsFields.find((field) => field.key === key)).toEqual(
        key === "event_date" ? { ...source, helpText: undefined } : source,
      );
    }
    expect(definition.eventTiming).toBe(original.eventTiming);
  });

  it("leaves other services unchanged", () => {
    expect(onTimeBirthLayout(original, "DCOLB-0079-BRAP")).toBe(original);
  });

  it("warns after day 30 with the birth date on the details page", () => {
    const definition = onTimeBirthLayout({
      ...original,
      eventTiming: {
        ...original.eventTiming!,
        mismatch: "outside_window",
        targetServiceCode: "birth_delayed",
        windowDays: 30,
        behavior: "redirect_confirm",
      },
    }, "OTCOLB-MARITAL");
    expect(fieldsForStep(definition, "details").some((field) => field.key === definition.eventTiming?.triggerField)).toBe(true);
    const check = (event_date: string) => evaluateTemplateEventTiming(definition, { event_date }, "2026-11-14")!;
    expect(check("2026-10-15").evaluation.mismatched).toBe(false);
    expect(check("2026-10-14").evaluation).toMatchObject({
      daysElapsed: 31,
      mismatched: true,
      behavior: "redirect_confirm",
      targetServiceCode: "birth_delayed",
    });
  });
});
