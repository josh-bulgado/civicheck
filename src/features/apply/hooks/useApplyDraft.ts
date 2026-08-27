import { useCallback, useSyncExternalStore } from "react";
import type { SubjectFields } from "~/lib/subject-fields";
import type { TemplateAnswers } from "~/features/forms/form-template.types";

const APPLY_DRAFT_EVENT = "civicheck:apply-draft";

interface ApplyDraftEventDetail {
  key: string;
  draft: ApplyDraft;
}

export interface ApplyDraftDocument {
  requirementId: string;
  requirementName: string;
  /** Null for shared request documents; otherwise the owning party role. */
  subjectRole: string | null;
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ApplyDraft {
  selectedServiceCode: string | null;
  /** Server-issued owner/lifecycle record for files staged before submission. */
  uploadDraftId: string | null;
  /** Answers to the database-backed service-variant questions. */
  caseSelectorAnswers: Record<string, string>;
  /**
   * Set only when this draft was seeded by a cross-group redirect (see
   * `seedDraftForGroup`) — consumed once by the case-selector step to skip
   * questions already answered in the group the applicant switched from.
   */
  presetAge: string | null;
  presetMarital: string | null;
  /** One entry per person the service asks about — see `subject-fields.ts`. */
  subjects: SubjectFields[];
  /** Answers keyed by the immutable field keys in the published form template. */
  answers: TemplateAnswers;
  contactNumber: string;
  eventDate: string;
  eventPlace: string;
  caseAnswers: {
    purpose: string;
    otherPurpose: string;
    additionalNotes: string;
    /** Only meaningful when the service defines `reference_number_label`. */
    referenceNumber: string;
    /** The rest are only meaningful when the service has `asks_birth_details`. */
    placeType: string;
    informantName: string;
    informantRelationship: string;
  };
  documents: ApplyDraftDocument[];
  updatedAt: string | null;
}

export const DEFAULT_APPLY_DRAFT: ApplyDraft = {
  selectedServiceCode: null,
  uploadDraftId: null,
  caseSelectorAnswers: {},
  presetAge: null,
  presetMarital: null,
  subjects: [],
  answers: {
    purpose: "Local Use (ID, Barangay, etc.)",
  },
  contactNumber: "",
  eventDate: "",
  eventPlace: "",
  caseAnswers: {
    purpose: "Local Use (ID, Barangay, etc.)",
    otherPurpose: "",
    additionalNotes: "",
    referenceNumber: "",
    placeType: "",
    informantName: "",
    informantRelationship: "",
  },
  documents: [],
  updatedAt: null,
};

function withMigratedAnswers(value: Partial<ApplyDraft>): ApplyDraft {
  const legacyCase = value.caseAnswers ?? DEFAULT_APPLY_DRAFT.caseAnswers;
  return {
    ...DEFAULT_APPLY_DRAFT,
    ...value,
    caseSelectorAnswers: value.caseSelectorAnswers ?? {},
    answers: {
      event_date: value.eventDate ?? "",
      event_place: value.eventPlace ?? "",
      purpose: legacyCase.purpose ?? "Local Use (ID, Barangay, etc.)",
      purpose_other: legacyCase.otherPurpose ?? "",
      additional_notes: legacyCase.additionalNotes ?? "",
      reference_number: legacyCase.referenceNumber ?? "",
      place_type: legacyCase.placeType ?? "",
      informant_name: legacyCase.informantName ?? "",
      informant_relationship: legacyCase.informantRelationship ?? "",
      subjects: value.subjects ?? [],
      contact_number: value.contactNumber ?? "",
      ...(value.answers ?? {}),
    },
    documents: (value.documents ?? []).map((document) => ({
      ...document,
      subjectRole: document.subjectRole ?? null,
    })),
  };
}

function storageKey(groupOrCode: string) {
  return `civicheck.apply.${groupOrCode}`;
}

function notifyDraftChange(key: string, draft: ApplyDraft) {
  window.dispatchEvent(
    new CustomEvent<ApplyDraftEventDetail>(APPLY_DRAFT_EVENT, {
      detail: { key, draft },
    }),
  );
}

// Draft is external state (localStorage, shared across every component
// reading the same key) — `useSyncExternalStore` reads it directly instead
// of mirroring it into `useState` via an effect, which also avoids the
// server/client mismatch flash: SSR and the first client render both get
// `SERVER_DRAFT`, then React re-renders with the real value right after
// hydration commits, with no extra render pass or `hydrated` flag to manage
// by hand.
const SERVER_DRAFT = DEFAULT_APPLY_DRAFT;
const draftCache = new Map<string, ApplyDraft>();

function readDraft(key: string): ApplyDraft {
  const cached = draftCache.get(key);
  if (cached) return cached;
  // A fresh object, never the `SERVER_DRAFT` singleton itself — `hydrated`
  // below is a reference check against that sentinel, so a first-ever visit
  // (nothing in storage yet) still needs to read as hydrated once this runs
  // on the client.
  let value: ApplyDraft = { ...DEFAULT_APPLY_DRAFT };
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = withMigratedAnswers(JSON.parse(raw));
  } catch {
    // corrupt or unavailable draft — start fresh
  }
  draftCache.set(key, value);
  return value;
}

function writeDraft(key: string, next: ApplyDraft) {
  draftCache.set(key, next);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // storage unavailable/full — draft still works for this session
  }
  notifyDraftChange(key, next);
}

function subscribeToDraft(key: string, onStoreChange: () => void) {
  function handleDraftChange(event: Event) {
    const { detail } = event as CustomEvent<ApplyDraftEventDetail>;
    if (detail.key !== key) return;
    draftCache.set(key, detail.draft);
    onStoreChange();
  }
  window.addEventListener(APPLY_DRAFT_EVENT, handleDraftChange);
  return () => window.removeEventListener(APPLY_DRAFT_EVENT, handleDraftChange);
}

/**
 * Writes a fresh draft under a *different* group/code's storage key — used
 * when the On-Time/Delayed birth-registration redirect switches the
 * applicant to a different `display_group`, which has its own draft key.
 * Not a hook: this fires once, outside of any component bound to that key.
 */
export function seedDraftForGroup(groupOrCode: string, seed: Partial<ApplyDraft>) {
  const next: ApplyDraft = {
    ...withMigratedAnswers(seed),
    updatedAt: new Date().toISOString(),
  };
  writeDraft(storageKey(groupOrCode), next);
}

export function useApplyDraft(groupOrCode: string) {
  const key = storageKey(groupOrCode);

  const draft = useSyncExternalStore(
    useCallback((onStoreChange) => subscribeToDraft(key, onStoreChange), [key]),
    () => readDraft(key),
    () => SERVER_DRAFT,
  );
  // Reference equality with the shared SSR sentinel — true once this
  // component has taken the client's `getSnapshot` branch.
  const hydrated = draft !== SERVER_DRAFT;

  const update = useCallback(
    (patch: Partial<ApplyDraft> | ((prev: ApplyDraft) => Partial<ApplyDraft>)) => {
      const prev = readDraft(key);
      const resolved = typeof patch === "function" ? patch(prev) : patch;
      writeDraft(key, {
        ...prev,
        ...resolved,
        updatedAt: new Date().toISOString(),
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    draftCache.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    // A fresh object — see the note in `readDraft` on why this can't be the
    // `SERVER_DRAFT` singleton.
    notifyDraftChange(key, { ...DEFAULT_APPLY_DRAFT });
  }, [key]);

  return { draft, update, clear, hydrated };
}
