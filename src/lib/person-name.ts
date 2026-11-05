export const INVALID_PERSON_NAME =
  "Names can contain only letters and spaces.";

export function validatePersonName(value: string): true | string {
  return !value.trim() ||
    (/\p{L}/u.test(value) && /^[\p{L}\p{M} ]+$/u.test(value)) ||
    INVALID_PERSON_NAME;
}

export function isNameField(field: { key: string; type: string }): boolean {
  return field.type === "text" && /(^|_)name($|_)|(^|_)surname($|_)/.test(field.key);
}
