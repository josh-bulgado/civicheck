import { describe, expect, it } from "vitest";
import {
  countByClassification,
  matchesClassification,
  matchesSearch,
  neighbourCode,
} from "./services-table.utils";

describe("countByClassification", () => {
  it("counts each classification and keeps a total", () => {
    const counts = countByClassification([
      { classification: "simple" },
      { classification: "simple" },
      { classification: "complex" },
      { classification: "highly_technical" },
      { classification: null },
    ]);
    expect(counts).toEqual({
      all: 5,
      simple: 2,
      complex: 1,
      highly_technical: 1,
      unclassified: 1,
    });
  });

  it("returns zeros for an empty registry", () => {
    expect(countByClassification([])).toEqual({
      all: 0,
      simple: 0,
      complex: 0,
      highly_technical: 0,
      unclassified: 0,
    });
  });
});

describe("matchesClassification", () => {
  it("lets everything through for 'all', including unclassified rows", () => {
    expect(matchesClassification("simple", "all")).toBe(true);
    expect(matchesClassification(null, "all")).toBe(true);
  });

  it("matches a named classification exactly", () => {
    expect(matchesClassification("complex", "complex")).toBe(true);
    expect(matchesClassification("complex", "simple")).toBe(false);
  });

  it("matches the unclassified filter only against null", () => {
    expect(matchesClassification(null, "unclassified")).toBe(true);
    expect(matchesClassification("simple", "unclassified")).toBe(false);
    expect(matchesClassification(null, "simple")).toBe(false);
  });
});

describe("matchesSearch", () => {
  const service = {
    name: "Delayed Registration of Birth",
    display_name: "Late Birth Registration",
    dossier_key: "birth-registration",
    variant_codes: ["Birth Timely", "Birth Delayed"],
  };

  it("matches everything when the query is empty or only spaces", () => {
    expect(matchesSearch(service, "")).toBe(true);
    expect(matchesSearch(service, "   ")).toBe(true);
  });

  it("prefers the public label over the internal name", () => {
    expect(matchesSearch(service, "late birth")).toBe(true);
    expect(matchesSearch(service, "Delayed Registration of Birth")).toBe(false);
  });

  it("falls back to the internal name when there is no public label", () => {
    expect(
      matchesSearch({ ...service, display_name: null }, "delayed registration"),
    ).toBe(true);
  });

  it("matches the dossier key and variant codes, ignoring case", () => {
    expect(matchesSearch(service, "BIRTH-REG")).toBe(true);
    expect(matchesSearch(service, "birth delayed")).toBe(true);
    expect(matchesSearch(service, "marriage")).toBe(false);
  });
});

describe("neighbourCode", () => {
  const codes = ["a", "b", "c"];

  it("steps forward and backward through the list", () => {
    expect(neighbourCode(codes, "b", 1)).toBe("c");
    expect(neighbourCode(codes, "b", -1)).toBe("a");
  });

  it("returns null at either end instead of wrapping", () => {
    expect(neighbourCode(codes, "a", -1)).toBeNull();
    expect(neighbourCode(codes, "c", 1)).toBeNull();
  });

  it("returns null when the current service is not in the list", () => {
    expect(neighbourCode(codes, "missing", 1)).toBeNull();
  });
});
