import { describe, expect, it } from "vitest";

import {
  acceptTrackingInput,
  formatTrackingNumber,
  isDigitsMode,
  lookupYears,
  parseTrackingInput,
  trackingYear,
} from "./tracking-input";

const YEARS = [2027, 2026];

describe("parseTrackingInput", () => {
  it("tries this year and last year for 6 bare digits", () => {
    expect(parseTrackingInput("818269", YEARS)).toEqual({
      kind: "digits",
      candidates: ["CCRO-2027-818269", "CCRO-2026-818269"],
    });
  });

  it("reads a whole number as one exact request, whichever way it is written", () => {
    const exact = { kind: "exact", candidates: ["CCRO-2026-818269"] };
    expect(parseTrackingInput("CCRO-2026-818269", YEARS)).toEqual(exact);
    expect(parseTrackingInput("  ccro-2026-818269 ", YEARS)).toEqual(exact);
    expect(parseTrackingInput("CCRO2026818269", YEARS)).toEqual(exact);
    expect(parseTrackingInput("2026818269", YEARS)).toEqual(exact);
    expect(parseTrackingInput("2026-818269", YEARS)).toEqual(exact);
  });

  it("waits while a scanner types the number one character at a time", () => {
    const typed = "CCRO-2026-818269";
    for (let length = 1; length < typed.length; length++) {
      expect(parseTrackingInput(typed.slice(0, length), YEARS).kind).toBe("incomplete");
    }
    expect(parseTrackingInput(typed, YEARS).kind).toBe("exact");
  });

  it("waits for more digits, and rejects lengths that cannot be a number", () => {
    expect(parseTrackingInput("", YEARS).kind).toBe("incomplete");
    expect(parseTrackingInput("81826", YEARS).kind).toBe("incomplete");
    expect(parseTrackingInput("8182691", YEARS).kind).toBe("incomplete");
    expect(parseTrackingInput("CCRO-26-818269", YEARS).kind).toBe("incomplete");
  });
});

describe("acceptTrackingInput", () => {
  it("takes digits and ignores stray letters, so the prefix stays drawn", () => {
    expect(acceptTrackingInput("8182", "818")).toBe("8182");
    expect(acceptTrackingInput("818d", "818")).toBe("818");
    expect(acceptTrackingInput("d", "")).toBe("");
    expect(acceptTrackingInput("dsds", "dsd")).toBe("dsd");
  });

  it("still lets a scanner type the whole number one character at a time", () => {
    const typed = "CCRO-2026-818269";
    let field = "";
    for (let length = 1; length <= typed.length; length++) {
      field = acceptTrackingInput(typed.slice(0, length), field);
    }
    expect(field).toBe(typed);
  });

  it("still takes a pasted whole number, in any case", () => {
    expect(acceptTrackingInput("ccro-2026-818269", "")).toBe("ccro-2026-818269");
    expect(acceptTrackingInput("CCRO2026818269", "")).toBe("CCRO2026818269");
    expect(acceptTrackingInput("2026-818269", "")).toBe("2026-818269");
  });

  it("rejects text that is not a tracking number", () => {
    expect(acceptTrackingInput("CCRX", "CCR")).toBe("CCR");
    expect(acceptTrackingInput("Tracking: 818269", "")).toBe("");
  });
});

describe("lookupYears", () => {
  it("uses the Philippine calendar year, so New Year's Eve in UTC is already next year", () => {
    // 23:30 UTC on 31 Dec is 07:30 on 1 Jan in Manila.
    expect(lookupYears(new Date("2026-12-31T23:30:00Z"))).toEqual([2027, 2026]);
    expect(lookupYears(new Date("2027-06-15T04:00:00Z"))).toEqual([2027, 2026]);
  });
});

describe("tracking number parts", () => {
  it("formats and reads the year back", () => {
    expect(formatTrackingNumber(2026, "000123")).toBe("CCRO-2026-000123");
    expect(trackingYear("CCRO-2026-000123")).toBe(2026);
    expect(trackingYear("nonsense")).toBeNull();
  });

  it("draws the prefix only while the field holds bare digits", () => {
    expect(isDigitsMode("")).toBe(true);
    expect(isDigitsMode("8182")).toBe(true);
    expect(isDigitsMode("CCRO-2026-")).toBe(false);
  });
});
