// The person (or people) a request is about — one "Subject" for most
// services, two ("Bride"/"Groom") for Marriage License. Shared between the
// online wizard and the staff walk-in dialog so both intake paths write the
// same `form_data` shape.

export interface SubjectFields {
  role: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: string;
}

const IMPLIED_SEX: Record<string, "male" | "female"> = {
  mother: "female",
  bride: "female",
  father: "male",
  groom: "male",
};

/** Roles whose sex is obvious from the role name itself — no need to ask. */
export function impliedSex(role: string): "male" | "female" | null {
  return IMPLIED_SEX[role.trim().toLowerCase()] ?? null;
}

export function emptySubject(role: string): SubjectFields {
  return {
    role,
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: impliedSex(role) ?? "",
  };
}

/** True when `current` already has one entry per role, in order. */
export function subjectsMatchRoles(current: SubjectFields[], roles: string[]): boolean {
  return current.length === roles.length && current.every((s, i) => s.role === roles[i]);
}

/**
 * Resize `current` to have exactly one entry per role, preserving any
 * already-typed values by position.
 */
export function reconcileSubjects(
  current: SubjectFields[],
  roles: string[],
): SubjectFields[] {
  return roles.map((role, i) => ({ ...(current[i] ?? emptySubject(role)), role }));
}

export function subjectFullName(subject: SubjectFields | undefined): string {
  if (!subject) return "";
  return [subject.firstName, subject.middleName, subject.lastName, subject.suffix]
    .filter(Boolean)
    .join(" ");
}

/**
 * Flattens the subjects array into the flat, primitive-only keys `form_data`
 * has always used, so every existing reader keeps working unchanged —
 * `applicantNameOf` and the cashier's `form_data->>subject_first_name` lookup
 * in requests.queries.ts, the tracking-by-last-name check in
 * track.queries.ts, and the generic `Object.entries(formData)` render in
 * RequestDetailPage.tsx.
 *
 * The first party keeps the original unprefixed `subject_*` keys; extra
 * parties get `party2_*`, `party3_*`, etc. `*_role` is only written when
 * there's more than one subject, so a single-subject service's `form_data`
 * stays byte-for-byte identical to before this feature existed.
 */
export function flattenSubjects(subjects: SubjectFields[]): Record<string, string> {
  const out: Record<string, string> = {};
  const multi = subjects.length > 1;

  subjects.forEach((subject, index) => {
    const prefix = index === 0 ? "subject" : `party${index + 1}`;
    if (multi) out[`${prefix}_role`] = subject.role;
    out[`${prefix}_first_name`] = subject.firstName;
    out[`${prefix}_middle_name`] = subject.middleName;
    out[`${prefix}_last_name`] = subject.lastName;
    out[`${prefix}_suffix`] = subject.suffix;
    out[`${prefix}_sex`] = subject.sex;
  });

  return out;
}
