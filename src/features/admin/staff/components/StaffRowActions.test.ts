import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../staff.types";
import { StaffRowActions } from "./StaffRowActions";

const handlers = {
  onManage: vi.fn(),
  onResend: vi.fn(),
  onCancel: vi.fn(),
  onRemove: vi.fn(),
  onReactivate: vi.fn(),
};

function member(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: "staff-1",
    email: "staff@example.com",
    firstName: "Civic",
    lastName: "Staff",
    role: "staff",
    invitedAt: "2026-11-05T00:00:00.000Z",
    emailConfirmed: true,
    confirmed: true,
    departmentId: "department-1",
    departmentName: "Birth Records",
    employmentType: "regular",
    status: "active",
    ...overrides,
  };
}

function render(staffMember: StaffMember) {
  return renderToStaticMarkup(
    createElement(StaffRowActions, {
      staffMember,
      isResending: false,
      ...handlers,
    }),
  );
}

describe("StaffRowActions", () => {
  it("shows access management and overflow actions for active staff", () => {
    const html = render(member());

    expect(html).toContain("Manage access");
    expect(html).toContain("Actions for Civic Staff");
    expect(html).toContain("More actions for Civic Staff");
    expect(html).toContain('data-slot="button-group"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('data-shape="pill"');
  });

  it("shows invitation actions for invited staff", () => {
    const html = render(member({ emailConfirmed: false, confirmed: false }));

    expect(html).toContain("Resend invitation");
    expect(html).not.toContain("Manage access");
    expect(html).toContain("Actions for Civic Staff");
    expect(html).toContain('data-slot="button-group"');
  });

  it("shows only reactivation for deactivated staff", () => {
    const html = render(member({ status: "deactivated" }));

    expect(html).toContain("Reactivate");
    expect(html).not.toContain("Manage access");
    expect(html).not.toContain("Actions for Civic Staff");
    expect(html).not.toContain('data-slot="button-group"');
  });
});
