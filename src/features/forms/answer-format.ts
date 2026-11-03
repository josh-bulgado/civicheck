import type { FormFieldDefinition } from "./form-template.types";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatReviewDate(value: string) {
  if (!value) return "—";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? value : REVIEW_DATE_FORMATTER.format(date);
}

/** An answer as the applicant should read it back: dates spelled out, option
 *  values shown as their labels, phone numbers with the country code. */
export function formatFieldAnswer(field: FormFieldDefinition, value: string) {
  if (!value) return "—";
  if (field.type === "date") return formatReviewDate(value);
  if (field.type === "phone") return `+63 ${value}`;
  if (field.type === "select") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}
