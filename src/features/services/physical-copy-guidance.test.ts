import { expect, it } from "vitest";
import { physicalCopyGuidance } from "./physical-copy-guidance";

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
