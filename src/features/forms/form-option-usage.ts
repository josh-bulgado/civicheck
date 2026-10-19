import type { FormTemplateDefinition } from "./form-template.types";

/**
 * A condition that lives outside the form definition (for example a
 * requirement's "applies when" rule) and still points at a dropdown option.
 */
export type ConditionRef = { field: string; value: string; where: string };

/**
 * Where a dropdown option is relied on. Conditions store the option value,
 * never its label, so usage is matched by `(field key, value)`. An empty array
 * means nothing depends on the option and it is safe to edit or remove.
 */
export function optionUsage(
  definition: FormTemplateDefinition,
  fieldKey: string,
  value: string,
  extra: readonly ConditionRef[] = [],
): string[] {
  const usage: string[] = [];

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (field.visibleWhen?.field === fieldKey && field.visibleWhen.value === value) {
        usage.push(`Shown when this is chosen — ${field.label}`);
      }
    }
  }

  for (const question of definition.caseSelector?.questions ?? []) {
    const matches = (question.visibleWhen?.conditions ?? []).some(
      (condition) => condition.field === fieldKey && condition.value === value,
    );
    if (matches) {
      usage.push(`Shown when this is chosen — ${question.label}`);
    }
  }

  for (const outcome of definition.caseSelector?.outcomes ?? []) {
    const matches = outcome.when.conditions.some(
      (condition) => condition.field === fieldKey && condition.value === value,
    );
    if (matches) usage.push(`Routes to ${outcome.serviceCode}`);
  }

  for (const ref of extra) {
    if (ref.field === fieldKey && ref.value === value) usage.push(ref.where);
  }

  return usage;
}

/**
 * A stored option value made from its label: lowercase, anything that is not a
 * letter or digit becomes `_`, trimmed, never empty, and numbered (`_2`, `_3`)
 * when `taken` already has it.
 */
export function deriveOptionValue(
  label: string,
  taken: ReadonlySet<string>,
): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "option";
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}
