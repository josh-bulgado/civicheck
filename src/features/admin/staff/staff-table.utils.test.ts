import { describe, expect, it } from "vitest";

import {
  countByRole,
  departmentLabel,
  matchesRole,
  matchesSearch,
  matchesStatus,
  staffStatus,
} from "./staff-table.utils";
import type { StaffMember } from "./staff.types";

function member(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: "1",
    email: "nicole@example.com",
    firstName: "Nicole",
    lastName: "Mier",
    role: "staff",
    invitedAt: "2026-01-01T00:00:00Z",
    emailConfirmed: true,
    confirmed: true,
    departmentId: "birth",
    departmentName: "Birth",
    employmentType: "regular",
    status: "active",
    ...overrides,
  };
}

describe("staffStatus", () => {
  it("reports an accepted, active account as active", () => {
    expect(staffStatus(member())).toEqual({ key: "active", label: "Active" });
  });

  it("tells apart an unconfirmed email from a pending setup", () => {
    expect(
      staffStatus(member({ confirmed: false, emailConfirmed: false })),
    ).toEqual({ key: "invited", label: "Invitation pending" });
    expect(
      staffStatus(member({ confirmed: false, emailConfirmed: true })),
    ).toEqual({ key: "invited", label: "Setup pending" });
  });

  it("keeps a deactivated account deactivated even if never accepted", () => {
    expect(
      staffStatus(member({ status: "deactivated", confirmed: false })).key,
    ).toBe("deactivated");
    expect(staffStatus(member({ status: "suspended" })).key).toBe(
      "deactivated",
    );
  });
});

describe("departmentLabel", () => {
  it("uses the role's fallback before the stored department", () => {
    expect(departmentLabel(member({ role: "cashier" }))).toBe("Not applicable");
    expect(departmentLabel(member({ role: "admin" }))).toBe("All departments");
  });

  it("shows the department, or Unassigned when there is none", () => {
    expect(departmentLabel(member())).toBe("Birth");
    expect(departmentLabel(member({ departmentName: null }))).toBe(
      "Unassigned",
    );
  });
});

describe("matchesSearch", () => {
  it("matches name, email, role, department and employment", () => {
    const m = member({ employmentType: "job_order" });
    expect(matchesSearch(m, "nicole mier")).toBe(true);
    expect(matchesSearch(m, "EXAMPLE.com")).toBe(true);
    expect(matchesSearch(m, "staff")).toBe(true);
    expect(matchesSearch(m, "birth")).toBe(true);
    expect(matchesSearch(m, "job order")).toBe(true);
    expect(matchesSearch(m, "marriage")).toBe(false);
  });

  it("matches everything for a blank query", () => {
    expect(matchesSearch(member(), "   ")).toBe(true);
  });
});

describe("filters", () => {
  it("matches a role chip, with all matching everyone", () => {
    expect(matchesRole(member({ role: "cashier" }), "cashier")).toBe(true);
    expect(matchesRole(member({ role: "cashier" }), "staff")).toBe(false);
    expect(matchesRole(member({ role: "cashier" }), "all")).toBe(true);
  });

  it("matches a status filter", () => {
    const invited = member({ confirmed: false });
    expect(matchesStatus(invited, "invited")).toBe(true);
    expect(matchesStatus(invited, "active")).toBe(false);
    expect(matchesStatus(invited, "all")).toBe(true);
  });
});

describe("countByRole", () => {
  it("counts every role chip, including roles nobody holds", () => {
    const counts = countByRole([
      { role: "cashier" },
      { role: "cashier" },
      { role: "staff" },
      { role: "admin" },
    ]);
    expect(counts).toEqual({
      all: 4,
      admin: 1,
      supervisor: 0,
      staff: 1,
      cashier: 2,
    });
  });
});
