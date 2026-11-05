const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";

/** Compare every named party; names suggest a duplicate but never prove one. */
export function sameRequestSubjects(
  current: Record<string, unknown>,
  previous: Record<string, unknown>,
): boolean {
  const keys = Object.keys(current).filter((key) =>
    /^(subject|party\d+)_(first_name|middle_name|last_name|suffix)$/.test(key),
  );
  if (!normalize(current.subject_first_name) || !normalize(current.subject_last_name)) return false;
  const previousKeys = Object.keys(previous).filter((key) =>
    /^(subject|party\d+)_(first_name|middle_name|last_name|suffix)$/.test(key),
  );
  const allKeys = new Set([...keys, ...previousKeys]);
  return [...allKeys].every((key) => normalize(current[key]) === normalize(previous[key]));
}

/** Signatures and their timestamps change on every submission, not its details. */
export function sameRequestDetails(
  current: Record<string, unknown>,
  previous: Record<string, unknown>,
  currentCopies = 1,
  previousCopies = 1,
): boolean {
  if (currentCopies !== previousCopies) return false;
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);
  keys.delete("requester_signature");
  keys.delete("requester_signed_at");
  return [...keys].every((key) => normalize(current[key]) === normalize(previous[key]));
}
