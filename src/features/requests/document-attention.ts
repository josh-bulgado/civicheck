/** Only staff-rejected files on an open request can require a replacement. */
export function partitionDocumentsForReupload<T extends { verificationStatus: string }>(
  documents: readonly T[],
  closed: boolean,
) {
  const needsReupload: T[] = [];
  const uploaded: T[] = [];
  for (const document of documents) {
    if (!closed && document.verificationStatus === "rejected") needsReupload.push(document);
    else uploaded.push(document);
  }
  return { needsReupload, uploaded };
}
