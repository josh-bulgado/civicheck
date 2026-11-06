import { describe, expect, it } from "vitest";
import { getMarriageLicenseTiming } from "./marriage-license-timing";

const TODAY = "2026-11-05";

describe("marriage license timing", () => {
  it.each([
    ["2026-11-05", true],
    ["2026-11-18", true],
    ["2026-11-19", false],
    ["2026-11-25", false],
  ])("classifies %s for progress blocking", (intendedDate, blocksProgress) => {
    expect(
      getMarriageLicenseTiming("MARRIAGE_LICENSE", intendedDate, TODAY)
        ?.blocksProgress,
    ).toBe(blocksProgress);
  });

  it("shows no warning at the recommended three-week lead time", () => {
    expect(
      getMarriageLicenseTiming("MARRIAGE_LICENSE", "2026-11-26", TODAY),
    ).toBeNull();
  });

  it("does not apply to other services", () => {
    expect(
      getMarriageLicenseTiming("BIRTH_ONTIME", "2026-11-06", TODAY),
    ).toBeNull();
  });
});
