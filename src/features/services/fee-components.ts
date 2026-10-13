import { z } from "zod";

/**
 * One line of a service's fee breakdown (`services_registry.fee_components`).
 *
 * `included` components are parts of the service fee and must add up to it.
 * The rest are real charges that sit on top — per-page copies, or a fee payable
 * at another stage — shown as "also payable" and never added to the total.
 */
export interface FeeComponent {
  label: string;
  amount: number;
  included: boolean;
}

export const feeComponentSchema = z.object({
  label: z.string().trim().min(1, "Describe this charge").max(120),
  amount: z.number().finite().min(0).max(1_000_000),
  included: z.boolean(),
});

const toCents = (amount: number) => Math.round(amount * 100);

const pesos = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Reads the jsonb column defensively: anything malformed is dropped. */
export function parseFeeComponents(value: unknown): FeeComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = feeComponentSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function splitFeeComponents(components: readonly FeeComponent[]) {
  return {
    included: components.filter((component) => component.included),
    alsoPayable: components.filter((component) => !component.included),
  };
}

export function includedFeeTotal(components: readonly FeeComponent[]): number {
  return (
    components
      .filter((component) => component.included)
      .reduce((sum, component) => sum + toCents(component.amount), 0) / 100
  );
}

/**
 * Message when the included components do not add up to the service fee, or
 * null when they do (or when nothing is itemized). Mirrors the database check.
 */
export function feeComponentsIssue(
  components: readonly FeeComponent[],
  fee: number,
): string | null {
  if (!components.some((component) => component.included)) return null;
  const total = includedFeeTotal(components);
  if (toCents(total) === toCents(fee)) return null;
  return `The included charges add up to ${pesos(total)}, but the total fee is ${pesos(fee)}.`;
}
