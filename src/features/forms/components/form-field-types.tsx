import {
  AlignLeft,
  CalendarDays,
  ListFilter,
  Phone,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FormFieldType } from "../form-template.types";

export interface FormFieldTypeOption {
  value: FormFieldType;
  label: string;
  icon: LucideIcon;
}

export const FIELD_TYPES: FormFieldTypeOption[] = [
  { value: "text", label: "Short text", icon: Type },
  { value: "textarea", label: "Long text", icon: AlignLeft },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "phone", label: "Philippine mobile number", icon: Phone },
  { value: "select", label: "Dropdown", icon: ListFilter },
  { value: "person_group", label: "Person name group", icon: Users },
];

export function fieldTypeLabel(type: FormFieldType) {
  return FIELD_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function FormFieldIcon({ type }: { type: FormFieldType }) {
  const Icon =
    FIELD_TYPES.find((item) => item.value === type)?.icon ?? Type;
  return <Icon aria-hidden="true" className="size-4" />;
}
