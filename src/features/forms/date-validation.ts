import { fromDateKey } from "~/lib/date";
import type { FormFieldDefinition } from "./form-template.types";
import { isEstimatedDate, validateEstimatedDate, validateRegistrationDate } from "./estimated-date";

// CTC has separate event dates; Email Inquiry uses event_date for every record.
export function registrationEventDate(answers: Record<string, unknown>): string {
  const key = answers.record_type === "death" ? "death_date"
    : answers.record_type === "marriage" ? "marriage_date"
    : answers.record_type === "other" ? "record_date" : "event_date";
  const value = answers[key] || answers.event_date;
  return typeof value === "string" ? value : "";
}

export function validateDateAnswer(
  field: FormFieldDefinition,
  value: string,
  answers: Record<string, unknown>,
  today: string,
): true | string {
  if (!value) return true;
  if (field.key === "registered_late_when") {
    const result = validateRegistrationDate(value, registrationEventDate(answers));
    if (result !== true) return result;
  }
  if (field.allowEstimate && isEstimatedDate(value)) return validateEstimatedDate(value, today);
  if (!fromDateKey(value)) return `${field.label} must be a valid date.`;
  if (field.dateDirection === "past" && value > today) return `${field.label} cannot be in the future.`;
  if (field.dateDirection === "future" && value < today) return `${field.label} cannot be in the past.`;
  return true;
}
