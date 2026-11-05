import { describe, expect, it } from "vitest";
import { formatFieldLabel } from "./field-label";

describe("formatFieldLabel", () => {
  it.each([
    ["Bride’s nationality", "Bride’s Nationality"],
    ["Groom's nationality", "Groom's Nationality"],
  ])("keeps the possessive s lowercase in %s", (label, expected) => {
    expect(formatFieldLabel(label)).toBe(expected);
  });
});
