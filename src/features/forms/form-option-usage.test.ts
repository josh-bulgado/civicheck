import { describe, expect, it } from "vitest";
import {
  deriveOptionValue,
  optionUsage,
  restoreOption,
  type ConditionRef,
} from "~/features/forms/form-option-usage";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

function definition(): FormTemplateDefinition {
  return {
    schemaVersion: 1,
    sections: [
      {
        key: "case",
        step: "case",
        title: "Case",
        fields: [
          {
            key: "nationality",
            type: "select",
            label: "Nationality",
            required: true,
            options: [
              { value: "filipino", label: "Filipino" },
              { value: "foreign", label: "Foreign national" },
            ],
          },
          {
            key: "license_no",
            type: "text",
            label: "Marriage license number",
            required: false,
            visibleWhen: {
              field: "nationality",
              operator: "equals",
              value: "foreign",
            },
          },
        ],
      },
    ],
  };
}

describe("optionUsage", () => {
  it("counts a field visibleWhen condition that uses the option value", () => {
    const def = definition();
    expect(optionUsage(def, "nationality", "foreign")).toEqual([
      "Shown when this is chosen — Marriage license number",
    ]);
    expect(optionUsage(def, "nationality", "filipino")).toEqual([]);
  });

  it("is keyed by value, so renaming the label changes nothing", () => {
    const def = definition();
    const before = optionUsage(def, "nationality", "foreign");
    def.sections[0].fields[0].options![1].label = "Foreign citizen";
    expect(optionUsage(def, "nationality", "foreign")).toEqual(before);
  });

  it("counts case selector outcome and question visibility conditions", () => {
    const def = definition();
    def.caseSelector = {
      title: "Find",
      questions: [
        {
          key: "q1",
          label: "Q1",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        {
          key: "q2",
          label: "Q2 follow-up",
          options: [
            { value: "x", label: "X" },
            { value: "y", label: "Y" },
          ],
          visibleWhen: {
            match: "all",
            conditions: [{ field: "q1", operator: "equals", value: "a" }],
          },
        },
      ],
      outcomes: [
        {
          serviceCode: "MARRIAGE-LATE",
          when: {
            match: "all",
            conditions: [{ field: "q1", operator: "equals", value: "a" }],
          },
        },
      ],
    };
    expect(optionUsage(def, "q1", "a")).toEqual([
      "Shown when this is chosen — Q2 follow-up",
      "Routes to MARRIAGE-LATE",
    ]);
    expect(optionUsage(def, "q1", "b")).toEqual([]);
  });

  it("counts a not_equals condition as usage", () => {
    const def = definition();
    def.sections[0].fields[1].visibleWhen = {
      field: "nationality",
      operator: "not_equals",
      value: "filipino",
    };
    expect(optionUsage(def, "nationality", "filipino")).toEqual([
      "Shown when this is chosen \u2014 Marriage license number",
    ]);
  });

  it("counts an event-timing window that depends on the answer", () => {
    const def = definition();
    def.eventTiming = {
      triggerField: "wedding_date",
      windowDays: 30,
      windowDaysByAnswer: { field: "nationality", values: { foreign: 15 } },
      mismatch: "outside_window",
      targetServiceCode: "MARRIAGE-LATE",
      behavior: "redirect_confirm",
      requireDocumentFirst: false,
      timezone: "Asia/Manila",
      title: "Late",
      description: "Late registration",
      ctaLabel: "Switch",
    };
    expect(optionUsage(def, "nationality", "foreign")).toContain(
      "Sets the registration window",
    );
    expect(optionUsage(def, "nationality", "filipino")).not.toContain(
      "Sets the registration window",
    );
  });

  it("counts external condition refs with the same field and value", () => {
    const extra: ConditionRef[] = [
      { field: "nationality", value: "filipino", where: "Requirement: Valid ID" },
      { field: "nationality", value: "foreign", where: "Requirement: Passport" },
      { field: "other", value: "filipino", where: "Requirement: Nope" },
    ];
    expect(optionUsage(definition(), "nationality", "filipino", extra)).toEqual([
      "Requirement: Valid ID",
    ]);
  });
});

describe("deriveOptionValue", () => {
  it("lowercases and snake-cases a label", () => {
    expect(deriveOptionValue("Foreign national", new Set())).toBe(
      "foreign_national",
    );
  });

  it("suffixes when the value is taken", () => {
    expect(
      deriveOptionValue("Foreign national", new Set(["foreign_national"])),
    ).toBe("foreign_national_2");
    expect(
      deriveOptionValue(
        "Foreign national",
        new Set(["foreign_national", "foreign_national_2"]),
      ),
    ).toBe("foreign_national_3");
  });

  it("never returns an empty value", () => {
    expect(deriveOptionValue("  !! ", new Set())).toBe("option");
    expect(deriveOptionValue("Option 1", new Set())).toBe("option_1");
  });
});

describe("deriveOptionValue edge cases", () => {
  it("strips diacritics", () => {
    expect(deriveOptionValue("Niño Ñandú", new Set())).toBe("nino_nandu");
  });

  it("keeps a leading digit", () => {
    expect(deriveOptionValue("2nd child", new Set())).toBe("2nd_child");
  });

  it("caps the value, suffix included, at 120 characters", () => {
    const label = "a".repeat(300);
    const first = deriveOptionValue(label, new Set());
    expect(first).toHaveLength(120);
    const second = deriveOptionValue(label, new Set([first]));
    expect(second.length).toBeLessThanOrEqual(120);
    expect(second.endsWith("_2")).toBe(true);
    expect(second).not.toBe(first);
  });
});

describe("restoreOption", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "c", label: "C" },
  ];

  it("inserts at the index", () => {
    const result = restoreOption(options, 1, { value: "b", label: "B" });
    expect(result.index).toBe(1);
    expect(result.options.map((option) => option.value)).toEqual(["a", "b", "c"]);
  });

  it("clamps the index to the current length", () => {
    const result = restoreOption(options, 9, { value: "b", label: "B" });
    expect(result.index).toBe(2);
    expect(result.options.map((option) => option.value)).toEqual(["a", "c", "b"]);
  });

  it("re-derives a free value when the old one was reused, keeping the label", () => {
    const result = restoreOption(options, 0, { value: "c", label: "Cee" });
    expect(result.options[0]).toEqual({ value: "cee", label: "Cee" });
  });

  it("falls back to a numbered value if the derived one is taken too", () => {
    const taken = [
      { value: "option_2", label: "Option 2" },
      { value: "option_2_2", label: "x" },
    ];
    const result = restoreOption(taken, 0, { value: "option_2", label: "Option 2" });
    expect(result.options[0].value).toBe("option_2_3");
  });
});
