export function validateEventPlace(
  field: { key: string; type: string; label: string },
  value: string,
): true | string {
  const isEventPlace =
    (field.type === "text" || field.type === "textarea") &&
    (/^(event_place|(?:birth|marriage|death)_place|place_of_(?:birth|marriage|death))$/.test(field.key) ||
      /\bplace\b.*\b(birth|born|marriage|married|death|died)\b/i.test(field.label));

  if (!isEventPlace || !value.trim() || /\p{L}/u.test(value)) return true;
  return `${field.label} can't contain only numbers or special characters.`;
}
