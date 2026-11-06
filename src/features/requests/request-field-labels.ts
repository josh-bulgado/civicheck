import { one } from "~/lib/embed";
import {
  parseFormTemplateDefinition,
  templateFieldLabels,
} from "~/features/forms/form-template.utils";
import { countryOptions } from "~/lib/countries";

type FormTemplateVersionEmbed =
  | { definition?: unknown }
  | { definition?: unknown }[]
  | null
  | undefined;

/** Safely reads labels from the optional form-template embed on a request. */
export function requestFieldLabelsOf(row: {
  form_template_versions?: FormTemplateVersionEmbed;
}): Record<string, string> {
  return requestFieldDisplayOf(row).fieldLabels;
}

/** Read only the selected choice labels from the request's saved form version. */
export function requestFieldDisplayOf(row: {
  form_template_versions?: FormTemplateVersionEmbed;
  form_data?: Record<string, unknown> | null;
}): { fieldLabels: Record<string, string>; fieldDisplayValues: Record<string, string> } {
  const empty = { fieldLabels: {}, fieldDisplayValues: {} };
  const version = one<{ definition?: unknown }>(row.form_template_versions);
  if (!version?.definition) return empty;
  try {
    const definition = parseFormTemplateDefinition(version.definition);
    const fieldDisplayValues: Record<string, string> = {};
    const selectedLabel = (key: string, options: readonly { value: string; label: string }[] | undefined) => {
      const value = row.form_data?.[key];
      if (typeof value !== "string") return;
      const selected = options?.find((option) => option.value === value);
      if (selected) fieldDisplayValues[key] = selected.label;
    };
    for (const question of definition.caseSelector?.questions ?? []) selectedLabel(question.key, question.options);
    for (const derived of definition.derivedAnswers ?? []) selectedLabel(derived.key, derived.bands);
    for (const section of definition.sections) {
      for (const field of section.fields) {
        if (field.type !== "select") continue;
        selectedLabel(field.key, field.options);
        if (field.countrySelect && !fieldDisplayValues[field.key]) {
          const value = row.form_data?.[field.key];
          const country = countryOptions.find((option) => option.code === value || option.name === value);
          if (country) fieldDisplayValues[field.key] = country.name;
        }
      }
    }
    return { fieldLabels: templateFieldLabels(definition), fieldDisplayValues };
  } catch {
    return empty;
  }
}
