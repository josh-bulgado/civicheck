import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { RegistrationDeadlineNotice } from "./components/RegistrationDeadlineNotice";

vi.mock("./hooks/usePostingToday", () => ({ usePostingToday: () => "2026-11-14" }));

function render(serviceCode = "BIRTH_ONTIME", status = "processing", formData: Record<string, unknown> = { event_date: "2026-10-18" }) {
  return renderToStaticMarkup(createElement(RegistrationDeadlineNotice, { serviceCode, status, formData }));
}

describe("staff registration deadline notice", () => {
  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "DEATH_ONTIME"])("shows the deadline and near-deadline warning for %s", (code) => {
    expect(render(code)).toContain("November 17, 2026");
    expect(render(code)).toContain("3 days remaining.");
    expect(render(code)).toContain("bg-warning-soft");
  });

  it.each([["with_license", "November 2, 2026", "Deadline passed 12 days ago"], ["article_34", "November 17, 2026", "3 days remaining"], ["pd_1083", "November 17, 2026", "3 days remaining"]])("uses the marriage basis %s", (basis, deadline, message) => {
    const html = render("MARRIAGE_ONTIME", "under_validation", { event_date: "2026-10-18", marriage_license_basis: basis });
    expect(html).toContain(deadline);
    expect(html).toContain(message);
  });

  it("shows due today, singular days, and ordinary deadlines", () => {
    expect(render("BIRTH_ONTIME", "submitted", { event_date: "2026-10-15" })).toContain("Due today.");
    expect(render("BIRTH_ONTIME", "incomplete", { event_date: "2026-10-16" })).toContain("1 day remaining.");
    expect(render("DEATH_ONTIME", "processing", { event_date: "2026-11-01" })).toContain("bg-tone-review-soft");
  });

  it.each([{}, { event_date: "2026-02-31" }, { event_date: "2026-12-01" }])("does not invent dates for invalid or missing answers", (answers) => {
    expect(render("BIRTH_ONTIME", "processing", answers)).toContain("deadline unavailable");
  });

  it("asks staff to check an unknown marriage basis", () => {
    expect(render("MARRIAGE_ONTIME")).toContain("deadline unavailable");
  });

  it.each(["ready_for_release", "released", "cancelled", "rejected"])("hides active warnings at %s", (status) => {
    expect(render("BIRTH_ONTIME", status)).toBe("");
  });

  it("excludes delayed and unrelated services", () => {
    expect(render("BIRTH_DELAYED")).toBe("");
    expect(render("CTC_ISSUANCE")).toBe("");
  });
});
