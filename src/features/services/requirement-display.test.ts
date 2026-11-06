import { describe, expect, it } from "vitest";
import { describeRequirement } from "./requirement-display";

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

  it("preserves conditional case information", () => {
    expect(describeRequirement("[Change of First Name] Supporting documents (3 copies)")).toEqual({
      title: "Supporting documents", detail: "(3 copies); Change of First Name",
    });
  });

  it("keeps meaningful title qualifiers and document alternatives", () => {
    expect(describeRequirement("Valid ID (with Signature)")).toEqual({ title: "Valid ID (with Signature)", detail: null });
    expect(describeRequirement("Parent's ID / birth certificate / death certificate (if deceased) — 1 original to present + 1 certified photocopy")).toEqual({
      title: "Parent's ID / birth certificate / death certificate", detail: "(if deceased); 1 original to present + 1 certified photocopy",
    });
  });
});
