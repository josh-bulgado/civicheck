import { describe, expect, it } from "vitest";

import type { ServiceRequirement } from "~/features/admin/services/services.types";

import {
  caseLabel,
  checklistFor,
  checklistText,
  feeBreakdownLabel,
  feeRangeLabel,
  groupServicesByCategory,
} from "./service-reference";

function requirement(
  overrides: Partial<ServiceRequirement> & { requirement_name: string },
): ServiceRequirement {
  return {
    id: overrides.requirement_name,
    service_code: null,
    is_mandatory: true,
    requirement_group: "birth_delayed",
    where_to_secure: null,
    case_tag: null,
    applies_when: null,
    requires_upload: false,
    upload_scope: "per_request",
    subject_role: null,
    ...overrides,
  } as ServiceRequirement;
}

describe("caseLabel", () => {
  it("takes the bracket at the end of the charter name", () => {
    expect(
      caseLabel({
        name: "Delayed Registration of COLB (0-79 yrs, Normal, Marital Child)",
        display_name: "Delayed Registration of Certificate of Live Birth",
      }),
    ).toBe("0-79 yrs, Normal, Marital Child");
    expect(
      caseLabel({
        name: "On-Time Registration of Certificate of Live Birth (Marital)",
        display_name: "On-Time Registration of Certificate of Live Birth",
      }),
    ).toBe("Marital");
  });

  it("drops the shared display name when there is no bracket", () => {
    expect(
      caseLabel({
        name: "Registration of Court Decrees: Annulment",
        display_name: "Registration of Court Decrees",
      }),
    ).toBe("Annulment");
  });

  it("shows the whole name when nothing can be removed", () => {
    expect(caseLabel({ name: "Legitimation", display_name: null })).toBe(
      "Legitimation",
    );
    expect(
      caseLabel({ name: "Legitimation", display_name: "Legitimation" }),
    ).toBe("Legitimation");
  });
});

describe("feeRangeLabel", () => {
  it("shows one amount when every case charges the same", () => {
    expect(feeRangeLabel(300, 300)).toBe("₱300.00");
    expect(feeRangeLabel(0, 0)).toBe("Free");
  });

  it("shows a range when the cases differ", () => {
    expect(feeRangeLabel(0, 800)).toBe("Free to ₱800.00");
    expect(feeRangeLabel(500, 800)).toBe("₱500.00 to ₱800.00");
  });
});

describe("feeBreakdownLabel", () => {
  it("spells out the charges that make up the fee", () => {
    expect(
      feeBreakdownLabel([
        { label: "Service fee", amount: 500, included: true },
        { label: "Admission of paternity", amount: 100, included: true },
        { label: "Copies", amount: 50, included: false, unit: "copy" },
      ]),
    ).toBe("Service fee ₱500.00 + Admission of paternity ₱100.00");
  });

  it("is null when there is nothing to add up", () => {
    expect(feeBreakdownLabel([])).toBeNull();
    expect(
      feeBreakdownLabel([{ label: "Service fee", amount: 500, included: true }]),
    ).toBeNull();
  });
});

describe("checklistFor", () => {
  const rows = [
    requirement({ requirement_name: "Valid ID" }),
    requirement({
      requirement_name: "Marriage Certificate of parents",
      case_tag: "marital_only",
      sort_order: 2,
    }),
    requirement({
      requirement_name: "Acknowledgement of paternity",
      case_tag: "non_marital_only",
      sort_order: 3,
    }),
    requirement({
      requirement_name: "Passport of the foreign parent",
      case_tag: "foreigner_only",
      is_mandatory: false,
    }),
  ];
  const names = (list: ServiceRequirement[]) =>
    list.map((row) => row.requirement_name);

  it("keeps only the documents that apply to the picked case", () => {
    const marital = checklistFor(rows, "DCOLB-0079-NORMAL-MARITAL");
    expect(names(marital.required)).toEqual([
      "Valid ID",
      "Marriage Certificate of parents",
    ]);

    const nonMarital = checklistFor(rows, "DCOLB-0079-NORMAL-NONMARITAL");
    expect(names(nonMarital.required)).toEqual([
      "Valid ID",
      "Acknowledgement of paternity",
    ]);
  });

  it("lists the optional documents apart from the required ones", () => {
    expect(
      names(checklistFor(rows, "DCOLB-0079-NORMAL-MARITAL").conditional),
    ).toEqual(["Passport of the foreign parent"]);
  });

  it("shows every case's documents while no case is picked", () => {
    expect(names(checklistFor(rows, null).required)).toHaveLength(3);
  });
});

describe("checklistText", () => {
  it("reads as a message, with where each document comes from", () => {
    const checklist = checklistFor(
      [
        requirement({
          requirement_name: "PSA Negative Certification — 1 original and 1 photocopy",
          where_to_secure: "Philippine Statistics Authority",
        }),
        requirement({
          requirement_name: "2x2 picture with white background",
          sort_order: 2,
        }),
        requirement({
          requirement_name: "Passport of the foreign parent",
          is_mandatory: false,
          where_to_secure: "Philippine Embassy",
        }),
      ],
      null,
    );

    expect(
      checklistText({
        title: "Delayed Registration of Certificate of Live Birth",
        caseText: "Marital",
        fee: "₱500.00",
        time: "3 hours + 10 calendar days",
        checklist,
      }),
    ).toBe(
      [
        "Delayed Registration of Certificate of Live Birth (Marital)",
        "Fee at cashier: ₱500.00. Time at the office: 3 hours + 10 calendar days.",
        "",
        "Documents to bring:",
        "- PSA Negative Certification (Philippine Statistics Authority)",
        "- 2x2 picture with white background",
        "",
        "Only if it applies:",
        "- Passport of the foreign parent (Philippine Embassy)",
      ].join("\n"),
    );
  });
});

describe("groupServicesByCategory", () => {
  const services = [
    { id: 1, department_id: "legal" },
    { id: 2, department_id: "birth" },
    { id: 3, department_id: "birth" },
    { id: 4, department_id: null },
  ];

  it("keeps one unlabelled group for staff in a single department", () => {
    expect(groupServicesByCategory(services.slice(1, 3), true)).toEqual([
      { key: "all", label: null, services: services.slice(1, 3) },
    ]);
    expect(groupServicesByCategory([], true)).toEqual([]);
  });

  it("sections everyone else by category, in directory order", () => {
    expect(
      groupServicesByCategory(services, false).map((group) => [
        group.label,
        group.services.map((service) => service.id),
      ]),
    ).toEqual([
      ["Birth", [2, 3]],
      ["Corrections", [1]],
      ["Other", [4]],
    ]);
  });
});
