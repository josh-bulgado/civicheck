import { describe, expect, it } from "vitest";
import { formatFieldLabel, formatNameHeading } from "./field-label";

describe("formatFieldLabel", () => {
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
