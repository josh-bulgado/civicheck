import type { ServiceClassification } from "./services.types";

export const CLASSIFICATION_FILTERS = [
  "all",
  "simple",
  "complex",
  "highly_technical",
  "unclassified",
] as const;
export type ClassificationFilter = (typeof CLASSIFICATION_FILTERS)[number];
export type ClassificationCounts = Record<ClassificationFilter, number>;

/** Counts behind the classification chips: they are both the overview and the filter. */
export function countByClassification(
  items: ReadonlyArray<{ classification: ServiceClassification | null }>,
): ClassificationCounts {
  const counts: ClassificationCounts = {
    all: items.length,
    simple: 0,
    complex: 0,
    highly_technical: 0,
    unclassified: 0,
  };
  for (const item of items) {
    counts[item.classification ?? "unclassified"] += 1;
  }
  return counts;
}

export function matchesClassification(
  classification: ServiceClassification | null,
  filter: ClassificationFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unclassified") return classification === null;
  return classification === filter;
}

/** Case-insensitive match on the service title, dossier key or any variant code. */
export function matchesSearch(
  service: {
    name: string;
    display_name: string | null;
    dossier_key: string;
    variant_codes: readonly string[];
  },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    (service.display_name ?? service.name).toLowerCase().includes(needle) ||
    service.dossier_key.toLowerCase().includes(needle) ||
    service.variant_codes.some((code) => code.toLowerCase().includes(needle))
  );
}

/**
 * The service before or after `current` in the table's visible order, or null
 * at either end. Drives the detail sheet's previous and next buttons.
 */
export function neighbourCode(
  codes: readonly string[],
  current: string,
  delta: 1 | -1,
): string | null {
  const index = codes.indexOf(current);
  if (index < 0) return null;
  return codes[index + delta] ?? null;
}
