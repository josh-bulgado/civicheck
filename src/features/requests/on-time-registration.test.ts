import { describe, expect, it } from "vitest";
import { onTimeRegistrationNotice } from "./on-time-registration";

describe("registration deadlines", () => {
  it("counts from birth rather than online submission", () => {
    const notice = onTimeRegistrationNotice("OTCOLB-MARITAL", { event_date: "2026-11-02" }, "2026-11-25");
    expect(notice).toContain("December 2, 2026");
    expect(notice).toContain("On-time registration deadline: December 2, 2026");
    expect(notice).toContain("Wait for CCRO’s notice before visiting the office.");
    expect(notice).toContain("7 days left");
    expect(notice).not.toContain("Visit CCRO by");
    expect(notice).toContain("30 days from the date of birth");
  });

  it.each([
    ["with_license", "November 17, 2026", "15 days"],
    ["article_34", "December 2, 2026", "30 days"],
    ["pd_1083", "December 2, 2026", "30 days"],
  ])("uses the marriage period for %s", (basis, deadline, period) => {
    const notice = onTimeRegistrationNotice("MARRIAGE_ONTIME", {
      event_date: "2026-11-02", marriage_license_basis: basis,
    }, "2026-11-03");
    expect(notice).toContain(deadline);
    expect(notice).toContain(period);
  });

  it("does not invent a deadline when the marriage basis is missing", () => {
    expect(onTimeRegistrationNotice("MARRIAGE_ONTIME", { event_date: "2026-11-02" }, "2026-11-03"))
      .not.toContain("Deadline:");
  });

  it("keeps the last day inclusive and flags the following day", () => {
    const answers = { event_date: "2026-11-02" };
    expect(onTimeRegistrationNotice("BIRTH_ONTIME", answers, "2026-12-02")).toContain("On-time registration deadline: December 2, 2026");
    expect(onTimeRegistrationNotice("BIRTH_ONTIME", answers, "2026-12-03")).toContain("deadline has passed");
  });

  it("handles leap years", () => {
    expect(onTimeRegistrationNotice("BIRTH_ONTIME", { event_date: "2028-02-01" }, "2028-02-29"))
      .toContain("On-time registration deadline: March 2, 2028");
  });

  it("includes the separate death reporting requirement", () => {
    const notice = onTimeRegistrationNotice("DEATH_ONTIME", { event_date: "2026-11-02" }, "2026-11-25");
    expect(notice).toContain("30 days from the date of death");
    expect(notice).toContain("48 hours");
  });

  it.each(["", "2026-02-31", "2026-12-20"])("avoids a false countdown for date %s", (event_date) => {
    expect(onTimeRegistrationNotice("BIRTH_ONTIME", { event_date }, "2026-11-25"))
      .not.toContain("Deadline:");
  });

  it("does not tell applicants already processing to wait for a visit notice", () => {
    expect(onTimeRegistrationNotice("BIRTH_ONTIME", { event_date: "2026-11-02" }, "2026-11-25", false)).not.toContain("Wait for");
  });

  it("leaves other services alone", () => {
    expect(onTimeRegistrationNotice("MARRIAGE_DELAYED")).toBeNull();
    expect(onTimeRegistrationNotice("CTC_ISSUANCE")).toBeNull();
  });
});
