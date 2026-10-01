// Groups a request's flat `form_data` by what it describes — each person,
// the event, the informant, everything else — so detail pages can render
// labelled sections instead of one undifferentiated list. See
// `flattenSubjects` in ~/lib/subject-fields for how the party keys are written.

type FormValue = string | number | boolean | null;

export interface FormDataRow {
  key: string;
  label: string;
  /** `""` only when `includeEmpty` is set and the field was left blank. */
  value: string | number | boolean;
}

export interface FormDataGroup {
  id: string;
  title: string;
  rows: FormDataRow[];
}

const PARTY_KEY = /^(subject|party(\d+))_(role|first_name|middle_name|last_name|suffix|sex)$/;

const EVENT_KEYS = ["event_date", "event_place", "place_type", "reference_number"];
const INFORMANT_KEYS = ["informant_name", "informant_relationship"];

function hasValue(value: FormValue | undefined): value is string | number | boolean {
  return value != null && value !== "";
}

export interface GroupFormDataOptions {
  /** Keep blank fields (as `""`) instead of dropping them — for staff review. */
  includeEmpty?: boolean;
}

export function groupFormData(
  formData: Record<string, FormValue>,
  labelFor: (key: string) => string,
  { includeEmpty = false }: GroupFormDataOptions = {},
): FormDataGroup[] {
  const keep = (value: FormValue | undefined) => includeEmpty || hasValue(value);
  const rowFor = (key: string, value: FormValue | undefined): FormDataRow => ({
    key,
    label: labelFor(key),
    value: hasValue(value) ? value : "",
  });
  const pick = (keys: string[]) =>
    keys.flatMap((key) => (key in formData && keep(formData[key]) ? [rowFor(key, formData[key])] : []));

  const claimed = new Set<string>();

  // One group per person. `subject_*` is the first party, `partyN_*` the rest.
  const parties = new Map<number, Record<string, FormValue>>();
  for (const [key, value] of Object.entries(formData)) {
    const match = PARTY_KEY.exec(key);
    if (!match) continue;
    claimed.add(key);
    const index = match[2] ? Number(match[2]) : 1;
    parties.set(index, { ...parties.get(index), [match[3]]: value });
  }

  const groups: FormDataGroup[] = [...parties.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, party]) => {
      const fullName = [
        party.first_name,
        party.middle_name,
        party.last_name,
        party.suffix,
      ]
        .filter(hasValue)
        .join(" ");
      const rows: FormDataRow[] = [];
      if (fullName || includeEmpty) {
        rows.push({ key: `party${index}_name`, label: "Full name", value: fullName });
      }
      if (hasValue(party.sex) || (includeEmpty && "sex" in party)) {
        rows.push({ key: `party${index}_sex`, label: "Sex", value: party.sex ?? "" });
      }
      return {
        id: `party-${index}`,
        title: hasValue(party.role) ? String(party.role) : "Subject",
        rows,
      };
    })
    .filter((group) => group.rows.length > 0);

  const event = pick(EVENT_KEYS);
  const informant = pick(INFORMANT_KEYS);
  [...EVENT_KEYS, ...INFORMANT_KEYS].forEach((key) => claimed.add(key));

  const other = Object.entries(formData).flatMap(([key, value]) =>
    !claimed.has(key) && keep(value) ? [rowFor(key, value)] : [],
  );

  if (event.length) groups.push({ id: "event", title: "Event details", rows: event });
  if (informant.length) groups.push({ id: "informant", title: "Informant", rows: informant });
  if (other.length) {
    groups.push({
      id: "other",
      title: groups.length ? "Other details" : "Request details",
      rows: other,
    });
  }

  return groups;
}
