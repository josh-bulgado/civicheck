import type { NormalizedAuditEvent } from "./system-admin.types";

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function formatAuditEventType(value: string) {
  return normalize(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function matchesAuditSearch(event: NormalizedAuditEvent, query: string) {
  const search = normalize(query);
  return (
    !search ||
    [event.actor, event.actorId ?? "", event.eventType].some((value) =>
      normalize(value).includes(search),
    )
  );
}
