import { isEstimatedDate } from "~/features/forms/estimated-date";

/** Labels saved with the submitted form, including service-specific event labels. */
export interface DetailsSource {
  formData: Record<string, string | number | boolean | null>;
  fieldLabels: Record<string, string>;
  /** Labels for selected options, read from the application's saved template. */
  fieldDisplayValues?: Record<string, string>;
  eventDateLabel: string | null;
  eventPlaceLabel: string | null;
  referenceNumberLabel: string | null;
}

export function formDataLabel(key: string, request: DetailsSource) {
  if (request.fieldLabels[key]) return request.fieldLabels[key];
  if (key === "event_date" && request.eventDateLabel) return request.eventDateLabel;
  if (key === "event_place" && request.eventPlaceLabel) return request.eventPlaceLabel;
  if (key === "reference_number" && request.referenceNumberLabel) {
    return request.referenceNumberLabel;
  }
  return key.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const DATE_KEYS = new Set([
  "event_date", "death_date", "marriage_date", "record_date", "registered_late_when",
]);

const ACRONYMS = /\b(?:brap|psa|ccro|ctc|id|sss|gsis|nbi|bir|lcro|lcr|dfa)\b/gi;
const LITERAL_FIELD = /(?:^|_)(?:name|surname|email|phone|number|address|notes?|description|message|reference|code|url|signature)(?:_|$)/;
const CHOICE_FIELD = /(?:^|_)(?:sex|gender|role|type|status|category|program|relationship|nationality|citizenship)$/;

function choiceLabel(value: string) {
  if (/^(?:yes|true)$/i.test(value)) return "Yes";
  if (/^(?:no|false)$/i.test(value)) return "No";
  const label = value.trim().replace(/_/g, " ")
    .replace(ACRONYMS, (word) => word.toUpperCase())
    .replace(/\bphilhealth\b/gi, "PhilHealth")
    .replace(/\bpag[ -]?ibig\b/gi, "Pag-IBIG");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatFormDataValue(key: string, value: string | number | boolean, source?: DetailsSource) {
  if (value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (DATE_KEYS.has(key)) {
    if (isEstimatedDate(String(value))) return String(value);
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  }
  const configuredLabel = source?.fieldDisplayValues?.[key];
  if (configuredLabel && source?.formData[key] === value) return choiceLabel(configuredLabel);
  if (typeof value === "string" && !LITERAL_FIELD.test(key)) {
    if (/^(?:yes|no|true|false)$/i.test(value)) return choiceLabel(value);
    if (CHOICE_FIELD.test(key) || key === "marital" || key === "program") return choiceLabel(value);
  }
  return String(value);
}
