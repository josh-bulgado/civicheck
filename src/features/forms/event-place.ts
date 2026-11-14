export function eventPlacePlaceholder(
  field: { key: string; label: string; placeholder?: string },
  recordType?: string,
): string | undefined {
  if (!/(?:^|_)place$|^place_of_/.test(field.key) && !/\bplace\b/i.test(field.label)) return field.placeholder;
  // An event_place can also name a court or an intended venue. Keep that copy.
  if (/court|intended|registered/i.test(field.label)) return field.placeholder;
  const match = /\b(birth|born|marriage|married|death|died)\b/i.exec(`${field.key.replaceAll("_", " ")} ${field.label}`);
  const type = match?.[1].toLowerCase() ?? (field.key === "event_place" ? recordType : undefined);
  if (type === "birth" || type === "born" || type === "death" || type === "died") {
    return "e.g. Hospital/clinic or house no., street, barangay, city/municipality, province";
  }
  if (type === "marriage" || type === "married") {
    return "e.g. Church or ceremony venue, barangay, city/municipality, province";
  }
  return field.placeholder;
}

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
