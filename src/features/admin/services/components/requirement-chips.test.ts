import { describe, expect, it } from "vitest";

import type { ConditionSource } from "~/features/forms/components/ConditionRuleBuilder";
import type { ConditionRule } from "~/features/forms/form-template.types";

import {
  defaultRequirementTab,
  filterRequirements,
  requirementChips,
  splitRequirementTitle,
} from "./requirement-chips";
import type { RequirementScopeKind } from "./requirement-scope";

const sources: ConditionSource[] = [
  {
    key: "nationality",
    label: "Nationality",
    options: [
      { value: "filipino", label: "Filipino" },
      { value: "foreign", label: "Foreign national" },
    ],
  },
  {
    key: "applicant_age",
    label: "Applicant age",
    options: [
      { value: "18_20", label: "18–20 years old" },
      { value: "21_up", label: "21 and above" },
    ],
  },
  {
    key: "civil_status",
    label: "Civil status",
    options: [{ value: "single", label: "Single" }],
  },
];

const equals = (field: string, value: string) => ({
  field,
  operator: "equals" as const,
  value,
});

const rule = (
  match: "all" | "any",
  conditions: ConditionRule["conditions"],
): ConditionRule => ({ match, conditions });

const chips = (appliesWhen: ConditionRule | null) =>
  requirementChips(
    { appliesWhen, uploadScope: "request", subjectRole: null },
    sources,
  );

describe("splitRequirementTitle", () => {
  it("splits at the first comma and trims the detail", () => {
    expect(
      splitRequirementTitle("Valid ID, with photo, and signature"),
    ).toEqual({ title: "Valid ID", detail: "with photo, and signature" });
  });

  it("has no detail without a comma", () => {
    expect(splitRequirementTitle("Valid ID")).toEqual({
      title: "Valid ID",
      detail: null,
    });
  });

  it("falls back for an empty name", () => {
    expect(splitRequirementTitle("")).toEqual({
      title: "Untitled requirement",
      detail: null,
    });
  });
});

describe("requirementChips condition", () => {
  it("renders the option label for the stored value", () => {
    expect(chips(rule("all", [equals("nationality", "filipino")])).condition).toBe(
      "Filipino",
    );
  });

  it("renders the current label after an option is renamed", () => {
    const renamed: ConditionSource[] = [
      {
        key: "nationality",
        label: "Nationality",
        options: [{ value: "filipino", label: "Citizen of the Philippines" }],
      },
    ];
    const out = requirementChips(
      {
        appliesWhen: rule("all", [equals("nationality", "filipino")]),
        uploadScope: "request",
        subjectRole: null,
      },
      renamed,
    );
    expect(out.condition).toBe("Citizen of the Philippines");
  });

  it("falls back to the raw value when the option is gone", () => {
    expect(chips(rule("all", [equals("nationality", "martian")])).condition).toBe(
      "martian",
    );
  });

  it("does not treat a source ending in 'age' as an age source", () => {
    const marriage: ConditionSource[] = [
      {
        key: "marriage",
        label: "Marriage",
        options: [{ value: "civil", label: "Civil" }],
      },
    ];
    const result = requirementChips(
      {
        appliesWhen: rule("all", [equals("marriage", "civil")]),
        uploadScope: "request",
        subjectRole: null,
      },
      marriage,
    );
    expect(result.condition).toBe("Civil");
    expect(result.condition).not.toMatch(/^Age /);
  });

  it("falls back to the raw value when an option label is empty", () => {
    const blank: ConditionSource[] = [
      {
        key: "nationality",
        label: "Nationality",
        options: [{ value: "filipino", label: "" }],
      },
    ];
    expect(
      requirementChips(
        {
          appliesWhen: rule("all", [equals("nationality", "filipino")]),
          uploadScope: "request",
          subjectRole: null,
        },
        blank,
      ).condition,
    ).toBe("filipino");
  });

  it("shortens an age source", () => {
    expect(chips(rule("all", [equals("applicant_age", "18_20")])).condition).toBe(
      "Age 18–20",
    );
  });

  it("prefixes not_equals with Not", () => {
    const r = rule("all", [
      { field: "nationality", operator: "not_equals", value: "filipino" },
    ]);
    expect(chips(r).condition).toBe("Not Filipino");
  });

  it("joins two conditions with + for all and or for any", () => {
    const conditions = [
      equals("nationality", "filipino"),
      equals("civil_status", "single"),
    ];
    expect(chips(rule("all", conditions)).condition).toBe("Filipino + Single");
    expect(chips(rule("any", conditions)).condition).toBe("Filipino or Single");
  });

  it("collapses more than two conditions to the first plus a count", () => {
    const r = rule("all", [
      equals("nationality", "filipino"),
      equals("civil_status", "single"),
      equals("applicant_age", "18_20"),
    ]);
    expect(chips(r).condition).toBe("Filipino +2");
  });

  it("is null with no rule or no conditions", () => {
    expect(chips(null).condition).toBeNull();
    expect(chips(rule("all", [])).condition).toBeNull();
  });
});

describe("requirementChips person", () => {
  const person = (
    uploadScope: "request" | "each_subject" | "specific_subject",
    subjectRole: string | null,
  ) =>
    requirementChips({ appliesWhen: null, uploadScope, subjectRole }, sources)
      .person;

  it("names the role for a specific subject", () => {
    expect(person("specific_subject", " Groom ")).toBe("Groom");
    expect(person("specific_subject", "  ")).toBeNull();
    expect(person("specific_subject", null)).toBeNull();
  });

  it("says Each person for each_subject", () => {
    expect(person("each_subject", null)).toBe("Each person");
  });

  it("is null for a request-level upload", () => {
    expect(person("request", "Groom")).toBeNull();
  });

  it("returns both chips null when nothing applies", () => {
    expect(
      requirementChips(
        { appliesWhen: null, uploadScope: "request", subjectRole: null },
        sources,
      ),
    ).toEqual({ condition: null, person: null });
  });
});

describe("filterRequirements", () => {
  const entries: Array<{
    id: number;
    scopeKind: RequirementScopeKind;
    searchText: string;
  }> = [
    { id: 1, scopeKind: "variant", searchText: "Valid ID" },
    { id: 2, scopeKind: "conditional", searchText: "Barangay clearance" },
    { id: 3, scopeKind: "inherited", searchText: "Valid passport" },
    { id: 4, scopeKind: "other", searchText: "Court order" },
  ];
  const ids = (list: Array<{ id: number }>) => list.map((e) => e.id);

  it("returns everything for the all tab with no query", () => {
    expect(ids(filterRequirements(entries, "all", ""))).toEqual([1, 2, 3, 4]);
    expect(ids(filterRequirements(entries, "all", "   "))).toEqual([1, 2, 3, 4]);
  });

  it("filters by kind for a specific tab", () => {
    expect(ids(filterRequirements(entries, "conditional", ""))).toEqual([2]);
  });

  it("ignores the tab when searching and matches case-insensitively", () => {
    expect(ids(filterRequirements(entries, "other", " VALID "))).toEqual([1, 3]);
  });
});

describe("defaultRequirementTab", () => {
  const counts = (conditional: number): Record<RequirementScopeKind, number> => ({
    variant: 3,
    conditional,
    inherited: 1,
    other: 0,
  });

  it("is all without conditional rows", () => {
    expect(defaultRequirementTab(counts(0))).toBe("all");
  });

  it("is conditional when it has rows", () => {
    expect(defaultRequirementTab(counts(2))).toBe("conditional");
  });
});
