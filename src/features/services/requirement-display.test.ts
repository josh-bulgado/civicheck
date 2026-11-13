import { describe, expect, it } from "vitest";
import { describeRequirement, requirementDisplayName } from "./requirement-display";
import { parseRequirementName } from "./service-utils";

it.each(["RA 10172 Sex/DOB Correction", "Change of First Name", "Reconstruction", "Foreign applicant", "Father did not acknowledge the child", "Decision not issued by the RTC of Legazpi City"])("removes the %s prefix across document displays", prefix => {
  const name = `[${prefix}] Certified true copy, all pages`;
  expect(requirementDisplayName(name)).toBe("Certified true copy, all pages");
  expect(parseRequirementName(name).primary).toBe("Certified true copy, all pages");
  expect(describeRequirement(name)).toEqual({title:"Certified true copy",detail:"all pages"});
});

it("preserves document wording, copy counts, and brackets within the actual title", () => {
  expect(requirementDisplayName("Certificate of Indigency")).toBe("Certificate of Indigency");
  expect(requirementDisplayName("[Reconstruction] Record [original], 2 copies")).toBe("Record [original], 2 copies");
});

describe("describeRequirement", () => {
  it("keeps a plain document title intact", () => {
    expect(describeRequirement("Birth Certificate of Parents")).toEqual({ title: "Birth Certificate of Parents", detail: null });
  });

  it("moves copy requirements and source notes below the name", () => {
    expect(describeRequirement("Birth Certificate, original + 2 certified xerox copies — secure from the Local Civil Registrar or PSA")).toEqual({
      title: "Birth Certificate", detail: "original + 2 certified xerox copies; Secure from the Local Civil Registrar or PSA",
    });
  });

  it("keeps a whole example list together, including its commas", () => {
    expect(describeRequirement("2 documentary evidences (e.g. baptismal certificate, school records, medical records), certified photocopies")).toEqual({
      title: "2 documentary evidences", detail: "(e.g. baptismal certificate, school records, medical records), certified photocopies",
    });
  });

  it("does not mistake commas inside an identifying qualifier for copy instructions", () => {
    expect(describeRequirement("Record (Local, PSA), 1 certified photocopy")).toEqual({ title: "Record (Local, PSA)", detail: "1 certified photocopy" });
  });

  it("retains the full quantity when it precedes the document name", () => {
    expect(describeRequirement("Four (4) copies of duly accomplished Certificate of Live Birth")).toEqual({
      title: "duly accomplished Certificate of Live Birth", detail: "Four (4) copies",
    });
  });

  it("omits the prefix while preserving copy information", () => {
    expect(describeRequirement("[Change of First Name] Supporting documents (3 copies)")).toEqual({
      title: "Supporting documents", detail: "(3 copies)",
    });
  });

  it("keeps meaningful title qualifiers and document alternatives", () => {
    expect(describeRequirement("Valid ID (with Signature)")).toEqual({ title: "Valid ID (with Signature)", detail: null });
    expect(describeRequirement("Parent's ID / birth certificate / death certificate (if deceased) — 1 original to present + 1 certified photocopy")).toEqual({
      title: "Parent's ID / birth certificate / death certificate", detail: "(if deceased); 1 original to present + 1 certified photocopy",
    });
  });
});
