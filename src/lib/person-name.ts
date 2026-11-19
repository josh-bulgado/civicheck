export const INVALID_PERSON_NAME =
  "Names can contain only letters and spaces.";

function checkPersonName(value: string, allowPeriods: boolean): true | string {
  return !value.trim() ||
    (/\p{L}/u.test(value) && (allowPeriods ? /^[\p{L}\p{M} .]+$/u : /^[\p{L}\p{M} ]+$/u).test(value)) ||
    (allowPeriods ? "Names can contain only letters, spaces, and periods." : INVALID_PERSON_NAME);
}

export function validatePersonName(value: string): true | string {
  return checkPersonName(value, false);
}

export function validateNameField(field: { key: string }, value: string): true | string {
  return checkPersonName(value, field.key === "father_name" || field.key === "father_full_name");
}

export function isNameField(field: { key: string; type: string }): boolean {
  return field.type === "text" && /(^|_)name($|_)|(^|_)surname($|_)/.test(field.key);
}
