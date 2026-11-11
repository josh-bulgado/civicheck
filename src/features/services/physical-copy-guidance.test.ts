import { expect, it } from "vitest";
import { delayedBirthUploadGuidance, physicalCopyGuidance } from "./physical-copy-guidance";

it.each([
  ["Letter Request, 3 copies", "3 copies"],
  ["CENOMAR of mother and father (PSA), 3 xerox copies each", "3 xerox copies each"],
  ["Birth Certificate, original + 2 certified xerox copies", "original + 2 certified xerox copies"],
  ["Death Certificate, 4 original copies", "4 original copies"],
  ["Supporting documents, 2 original/certified photocopies of each", "2 original/certified photocopies of each"],
])("preserves physical-copy instructions: %s", (name, detail) => {
  expect(physicalCopyGuidance(name)).toContain("Upload one complete copy of each document (all pages).");
  expect(physicalCopyGuidance(name)).toContain(detail);
});

it("does not turn a number of documents into a physical-copy count", () => {
  expect(physicalCopyGuidance("At least 3 supporting documents")).toBeNull();
  expect(physicalCopyGuidance("Valid ID")).toBeNull();
});

it.each([
  ["Four (4) copies of duly accomplished Certificate of Live Birth", "Four (4) copies"],
  ["Barangay Residency Certificate — 1 original or certified photocopy", "1 original or certified photocopy"],
  ["Valid ID of the registrant / informant — with personal appearance", "personal appearance"],
  ["Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father - with IDs of parents and child (for Non-Marital Child)", "IDs of parents and child"],
])("keeps delayed-birth physical instructions visible: %s", (name, detail) => {
  expect(delayedBirthUploadGuidance(name)).toContain(detail);
});
