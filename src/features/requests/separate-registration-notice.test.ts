import { expect, it } from "vitest";
import { onTimeRegistrationNotice } from "./on-time-registration";
import { separateRegistrationNotice } from "./separate-registration-notice";

it("keeps review and waiting instructions while moving deadline information out", () => {
  const notice = onTimeRegistrationNotice("OTCOLB-MARITAL", { event_date: "2026-11-01" }, "2026-11-14")!;
  const result = separateRegistrationNotice({ kind: "line", text: `CCRO is reviewing your documents.\n\n${notice}` }, notice);
  expect(result).toEqual({ kind: "line", text: "Wait for CCRO’s notice before visiting the office.\n\nCCRO is reviewing your documents." });
});

it("keeps the waiting instruction for a submitted request", () => {
  const notice = onTimeRegistrationNotice("BIRTH_ONTIME")!;
  expect(separateRegistrationNotice({ kind: "line", text: notice }, notice)).toEqual({ kind: "line", text: "Wait for CCRO’s notice before visiting the office." });
});

it("keeps processing visit instructions without the registration notice", () => {
  const notice = onTimeRegistrationNotice("BIRTH_ONTIME", {}, undefined, false)!;
  expect(separateRegistrationNotice({ kind: "steps", steps: ["Visit CCRO"], registrationNotice: notice }, notice)).toEqual({ kind: "steps", steps: ["Visit CCRO"] });
});

it("leaves other requests and completed requests alone", () => {
  const next = { kind: "line" as const, text: "Claim your document." };
  expect(separateRegistrationNotice(next, null)).toBe(next);
  expect(separateRegistrationNotice(null, null)).toBeNull();
});

it.each([
  ["MARRIAGE_ONTIME", "with_license", "November 16, 2026 (2 days left)", "15 days from the date of marriage"],
  ["MARRIAGE_ONTIME", "article_34", "December 1, 2026 (17 days left)", "30 days from the date of marriage"],
  ["MARRIAGE_ONTIME", "pd_1083", "December 1, 2026 (17 days left)", "30 days from the date of marriage"],
  ["DEATH_ONTIME", "", "December 1, 2026 (17 days left)", "30 days from the date of death"],
])("separates the correct deadline and waiting instruction for %s (%s)", (code, basis, deadline, period) => {
  const notice = onTimeRegistrationNotice(code, { event_date: "2026-11-01", marriage_license_basis: basis }, "2026-11-14")!;
  expect(notice).toContain(deadline);
  expect(notice).toContain(period);
  if (code === "DEATH_ONTIME") expect(notice).toContain("48 hours");
  const next = separateRegistrationNotice({ kind: "line", text: `Review in progress.\n\n${notice}` }, notice);
  expect(next).toEqual({ kind: "line", text: "Wait for CCRO’s notice before visiting the office.\n\nReview in progress." });
});
