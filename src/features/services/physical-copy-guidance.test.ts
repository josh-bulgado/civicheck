import { expect, it } from "vitest";
import { delayedBirthUploadGuidance, physicalCopyGuidance } from "./physical-copy-guidance";

it.each([
  ["Letter Request, 3 copies", "3 copies"],
  ["CENOMAR of mother and father (PSA), 3 xerox copies each", "3 xerox copies each"],
  ["Birth Certificate, original + 2 certified xerox copies", "original + 2 certified xerox copies"],
  ["Death Certificate, 4 original copies", "4 original copies"],
  ["Supporting documents, 2 original/certified photocopies of each", "2 original/certified photocopies of each"],
  ["Affidavit, 3 original copies", "3 original copies"],
  ["Court Decision, four original copies", "four original copies"],
  ["Supporting affidavit, six copies", "six copies"],
])("preserves physical-copy instructions: %s", (name, detail) => {
  expect(physicalCopyGuidance(name)).toContain("Upload only one (1) copy of each document (all pages).");
  expect(physicalCopyGuidance(name)).toContain("Bring to CCRO:");
  expect(physicalCopyGuidance(name)).toContain(detail);
});

it("does not turn a number of documents into a physical-copy count", () => {
  expect(physicalCopyGuidance("At least 3 supporting documents")).toBeNull();
  expect(physicalCopyGuidance("Valid ID")).toBe("Add a PDF or clear photos of the ID.");
});

it.each([
  ["Four (4) copies of duly accomplished Certificate of Live Birth", "Four (4) copies"],
  ["Barangay Residency Certificate — 1 original or certified photocopy", "1 original or certified photocopy"],
  ["Valid ID of the registrant / informant — with personal appearance", "personal appearance"],
  ["Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father - with IDs of parents and child (for Non-Marital Child)", "IDs of parents and child"],
])("keeps delayed-birth physical instructions visible: %s", (name, detail) => {
  expect(delayedBirthUploadGuidance(name)).toContain(detail);
  expect(delayedBirthUploadGuidance(name)?.includes("Upload only one (1) copy")).toBe(name.startsWith("Four (4)"));
});

it.each(["[Advance Endorsement] Valid ID", "[Negative to PSA CRS] Valid ID", "[Blurred/Illegible Entries] Valid ID", "Valid IDs"])("uses ID wording for %s", (name) => {
  expect(physicalCopyGuidance(name)).toBe("Add a PDF or clear photos of the ID.");
});

it("keeps ID copy requirements without page wording", () => {
  const guidance = physicalCopyGuidance("Valid ID, 1 photocopy with picture and signature");
  expect(guidance).toContain("Add a PDF or clear photos of the ID.");
  expect(guidance).not.toContain("only one (1)");
  expect(guidance).toContain("1 photocopy with picture and signature");
  expect(guidance).not.toContain("pages");
});

it.each([
  "Birth Certificate, 1 copy",
  "Affidavit, one original copy",
  "At least 3 supporting documents, 1 photocopy each",
  "Barangay Certificate — 1 original or certified photocopy",
])("does not add one-copy emphasis to a single-copy requirement: %s", name => {
  expect(physicalCopyGuidance(name) ?? "").not.toContain("only one (1)");
  expect(delayedBirthUploadGuidance(name) ?? "").not.toContain("only one (1)");
});

it("adds one-copy emphasis to IDs only when multiple physical copies are required", () => {
  expect(physicalCopyGuidance("Valid ID, 2 photocopies")).toContain("Upload only one (1) copy");
  expect(delayedBirthUploadGuidance("Valid ID, 1 photocopy")).not.toContain("only one (1)");
});

it("keeps ID alternatives and delayed-birth instructions", () => {
  const guidance = delayedBirthUploadGuidance("Parent's valid ID / Birth Certificate / Death Certificate if deceased — 1 original to be presented and 1 certified photocopy");
  expect(guidance).toContain("ID or listed alternative");
  expect(guidance).toContain("1 original to be presented and 1 certified photocopy");
  expect(guidance).not.toContain("pages");
});
