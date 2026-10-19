import type {
  FormOption,
  FormTemplateDefinition,
} from "./form-template.types";

/** Longest value a dropdown option may store (see `formOptionSchema`). */
const MAX_OPTION_VALUE = 120;

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

  const byAnswer = definition.eventTiming?.windowDaysByAnswer;
  if (byAnswer?.field === fieldKey && Object.hasOwn(byAnswer.values, value)) {
    usage.push("Sets the registration window");
  }

  for (const ref of extra) {
    if (ref.field === fieldKey && ref.value === value) usage.push(ref.where);
  }

  return usage;
}

/**
 * A stored option value made from its label: lowercase, accents dropped,
 * anything that is not a letter or digit becomes `_`, trimmed, never empty, at
 * most 120 characters, and numbered (`_2`, `_3`) when `taken` already has it.
 */
export function deriveOptionValue(
  label: string,
  taken: ReadonlySet<string>,
): string {
  const base =
    label
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, MAX_OPTION_VALUE)
      .replace(/_+$/g, "") || "option";
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const tail = `_${suffix}`;
    const candidate = `${base.slice(0, MAX_OPTION_VALUE - tail.length)}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Puts a removed option back (Undo). The index is clamped to the current
 * length. If its value has been taken since (Add Option can derive the same one
 * again) a free value is derived from the label, so the label always survives
 * and two options never share a value.
 */
export function restoreOption(
  options: readonly FormOption[],
  index: number,
  option: FormOption,
): { options: FormOption[]; index: number; option: FormOption } {
  const at = Math.max(0, Math.min(index, options.length));
  const taken = new Set(options.map((item) => item.value));
  const restored = taken.has(option.value)
    ? { ...option, value: deriveOptionValue(option.label, taken) }
    : option;
  return {
    options: [...options.slice(0, at), restored, ...options.slice(at)],
    index: at,
    option: restored,
  };
}
