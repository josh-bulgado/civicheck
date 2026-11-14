import { expect, it } from "vitest";
import { marriageLicenseDateTooSoon } from "./marriage-license-date";

it.each([
  ["2026-11-14", true],
  ["2026-11-20", true],
  ["2026-11-23", true],
  ["2026-11-24", false],
  ["2027-02-07", false],
  ["2026-11-13", false],
  ["", false],
  ["2026-02-30", false],
])("flags only fresh-request dates less than ten calendar days away: %s", (date, expected) => {
  expect(marriageLicenseDateTooSoon("MARRIAGE_LICENSE", date, "2026-11-14")).toBe(expected);
});

it("does not affect marriage registration or other services", () => {
  for (const code of ["MARRIAGE_ONTIME", "MARRIAGE_DELAYED", "DEATH_ONTIME"])
    expect(marriageLicenseDateTooSoon(code, "2026-11-20", "2026-11-14")).toBe(false);
});
