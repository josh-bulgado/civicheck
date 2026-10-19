import { describe, expect, it } from "vitest";
import {
  deriveOptionValue,
  optionUsage,
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
