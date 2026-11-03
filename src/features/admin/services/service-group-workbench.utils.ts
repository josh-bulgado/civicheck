import { splitFeeComponents } from "~/features/services/fee-components";
import type { Service, UpdateServiceInput } from "./services.types";

/** Largest fee the fee-component schema accepts. */
const MAX_FEE = 1_000_000;

export type FeeFilter = "all" | "free" | "paid";

/** What the admin has typed into the inspector but not saved yet. */
export interface VariantDraft {
  name?: string;
  fee?: string;
  processing_time?: string;
}

export interface DraftEvaluation {
  /** Only the fields that differ from the saved variant. */
  updates: UpdateServiceInput;
  errors: { name?: string; fee?: string };
  dirty: boolean;
}

/**
 * Reads a fee field: "", "free" and "0" are free, anything else must be a peso
 * amount with at most two decimals. Returns null when it is not a number.
 */
export function parseFeeInput(raw: string): number | null {
  const text = raw.trim().replace(/[₱,\s]/g, "");
  if (text === "" || /^free$/i.test(text)) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return amount <= MAX_FEE ? amount : null;
}

/**
 * Included fee components must add up to the fee (a database check), so a
 * variant with a breakdown is priced in the full editor, not from one field.
 */
export function isFeeItemized(service: Pick<Service, "fee_components">) {
  return splitFeeComponents(service.fee_components ?? []).included.length > 0;
}

export function evaluateDraft(
  variant: Pick<Service, "name" | "fee" | "processing_time" | "fee_components">,
  draft: VariantDraft | undefined,
): DraftEvaluation {
  const updates: UpdateServiceInput = {};
  const errors: DraftEvaluation["errors"] = {};
  let dirty = false;
  if (!draft) return { updates, errors, dirty };

  if (draft.name !== undefined && draft.name.trim() !== variant.name) {
    dirty = true;
    if (draft.name.trim() === "") errors.name = "Enter a name for this variant.";
    else updates.name = draft.name.trim();
  }

  if (draft.fee !== undefined && !isFeeItemized(variant)) {
    const amount = parseFeeInput(draft.fee);
    if (amount === null) {
      dirty = true;
      errors.fee = "Enter an amount such as 500.00, or 0 for free.";
    } else if (amount !== Number(variant.fee)) {
      dirty = true;
      updates.fee = amount;
    }
  }

  if (
    draft.processing_time !== undefined &&
    draft.processing_time.trim() !== variant.processing_time
  ) {
    dirty = true;
    updates.processing_time = draft.processing_time.trim();
  }

  return { updates, errors, dirty };
}

export function filterVariants(
  variants: readonly Service[],
  { query, fee }: { query: string; fee: FeeFilter },
) {
  const needle = query.trim().toLowerCase();
  return variants.filter((variant) => {
    if (fee === "free" && Number(variant.fee) !== 0) return false;
    if (fee === "paid" && Number(variant.fee) === 0) return false;
    if (!needle) return true;
    return (
      variant.service_code.toLowerCase().includes(needle) ||
      variant.name.toLowerCase().includes(needle)
    );
  });
}

export function summarizeVariants(variants: readonly Service[]) {
  const fees = [...new Set(variants.map((variant) => Number(variant.fee)))].sort(
    (left, right) => left - right,
  );
  const processingTimes = [
    ...new Set(variants.map((variant) => variant.processing_time)),
  ];
  // The requirement table is owned by `requirement_group`, falling back to the
  // variant's own code when it has no shared group.
  const checklistCount = new Set(
    variants.map((variant) => variant.requirement_group ?? variant.service_code),
  ).size;
  return {
    count: variants.length,
    freeCount: variants.filter((variant) => Number(variant.fee) === 0).length,
    fees,
    processingTimes,
    checklistCount,
  };
}

/** How many variants read the same checklist as `variant`, itself included. */
export function checklistSharedCount(
  variant: Pick<Service, "requirement_group" | "service_code">,
  variants: readonly Pick<Service, "requirement_group" | "service_code">[],
) {
  const key = variant.requirement_group ?? variant.service_code;
  return variants.filter(
    (candidate) => (candidate.requirement_group ?? candidate.service_code) === key,
  ).length;
}
