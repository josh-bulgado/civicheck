import { one } from "~/lib/embed";
import {
  parseFormTemplateDefinition,
  templateFieldLabels,
} from "~/features/forms/form-template.utils";

type FormTemplateVersionEmbed =
  | { definition?: unknown }
  | { definition?: unknown }[]
  | null
  | undefined;

/** Safely reads labels from the optional form-template embed on a request. */
export function requestFieldLabelsOf(row: {
  form_template_versions?: FormTemplateVersionEmbed;
}): Record<string, string> {
  const version = one<{ definition?: unknown }>(row.form_template_versions);
  if (!version?.definition) return {};
  try {
    return templateFieldLabels(parseFormTemplateDefinition(version.definition));
  } catch {
    return {};
  }
}
