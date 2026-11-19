import { describe, expect, it } from "vitest";
import { formatFieldLabel, formatNameHeading } from "./field-label";

describe("formatFieldLabel", () => {
  it.each([
    ["New First Name You Want", "New first name you want"],
    ["First Name As Currently Recorded", "First name as currently recorded"],
    ["Date Of The Event On The Record", "Date of the event on the record"],
    ["Is The Record Registered At PSA?", "Is the record registered at PSA?"],
    ["Was the decision issued by the RTC of Legazpi City?", "Was the decision issued by the RTC of Legazpi City?"],
    ["Submit NBI And PNP Clearances", "Submit NBI and PNP clearances"],
    ["Birth Day Or Month", "Birth Day Or Month"],
    ["Mother's Maiden Last Name", "Mother's Maiden Last Name"],
    ["New First Name You Want (optional)", "New first name you want (optional)"],
    ["Registry Reference Number (optional)", "Registry Reference Number (Optional)"],
  ])("formats the word-count boundary and acronyms in %s", (label, expected) => {
    expect(formatFieldLabel(label)).toBe(expected);
  });
  it.each([
    ["Bride’s nationality", "Bride’s Nationality"],
    ["Groom's nationality", "Groom's Nationality"],
  ])("keeps the possessive s lowercase in %s", (label, expected) => {
    expect(formatFieldLabel(label)).toBe(expected);
  });
});

it.each([
  ["Name of Husband", "Husband's Name"],
  ["Maiden Name of Wife", "Wife's Maiden Name"],
  ["Child", "Child's Name"],
  ["Groom", "Groom's Name"],
  ["Bride", "Bride's Name"],
  ["Mother", "Mother's Maiden Name"],
  ["Father", "Father's Name"],
  ["Full name of the deceased", "Deceased Person's Name"],
])("uses possessive name headings for %s", (label, expected) => {
  expect(formatNameHeading(label)).toBe(expected);
});
