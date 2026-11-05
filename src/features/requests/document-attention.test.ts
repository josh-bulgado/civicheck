import { describe, expect, it } from "vitest";
import { partitionDocumentsForReupload } from "./document-attention";

describe("partitionDocumentsForReupload", () => {
  const documents = [
    { id: "approved", verificationStatus: "approved" },
    { id: "rejected-first", verificationStatus: "rejected" },
    { id: "pending", verificationStatus: "pending" },
    { id: "rejected-second", verificationStatus: "rejected" },
  ];

  it("collects all replacement actions first while preserving order within each section", () => {
    const result = partitionDocumentsForReupload(documents, false);
    expect(result.needsReupload.map((doc) => doc.id)).toEqual(["rejected-first", "rejected-second"]);
    expect(result.uploaded.map((doc) => doc.id)).toEqual(["approved", "pending"]);
    expect(documents.map((doc) => doc.id)).toEqual(["approved", "rejected-first", "pending", "rejected-second"]);
  });

  it("removes a successfully resubmitted file from the attention section", () => {
    const resubmitted = documents.map((doc) => doc.id === "rejected-first" ? { ...doc, verificationStatus: "pending" } : doc);
    const result = partitionDocumentsForReupload(resubmitted, false);
    expect(result.needsReupload.map((doc) => doc.id)).toEqual(["rejected-second"]);
    expect(result.uploaded.map((doc) => doc.id)).toEqual(["approved", "rejected-first", "pending"]);
  });

  it("does not offer replacement actions for a closed request", () => {
    expect(partitionDocumentsForReupload(documents, true)).toEqual({ needsReupload: [], uploaded: documents });
  });

  it("keeps pending and approved files out of the action section", () => {
    const reviewed = documents.filter((doc) => doc.verificationStatus !== "rejected");
    expect(partitionDocumentsForReupload(reviewed, false)).toEqual({ needsReupload: [], uploaded: reviewed });
  });

  it("supports a request without any uploads", () => {
    expect(partitionDocumentsForReupload([], false)).toEqual({ needsReupload: [], uploaded: [] });
  });
});
