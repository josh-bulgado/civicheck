import { useCallback, useEffect, useState } from "react";
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
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ApplyDraft {
  selectedServiceCode: string | null;
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
  const key = storageKey(groupOrCode);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // storage unavailable/full — the target step falls back to a blank draft
  }
  notifyDraftChange(key, next);
}

export function useApplyDraft(groupOrCode: string) {
  const key = storageKey(groupOrCode);
  const [draft, setDraft] = useState<ApplyDraft>(DEFAULT_APPLY_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function handleDraftChange(event: Event) {
      const { detail } = event as CustomEvent<ApplyDraftEventDetail>;
      if (detail.key === key) setDraft(detail.draft);
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setDraft(withMigratedAnswers(JSON.parse(raw)));
    } catch {
      // corrupt or unavailable draft — start fresh
    }
    setHydrated(true);
    window.addEventListener(APPLY_DRAFT_EVENT, handleDraftChange);
    return () => window.removeEventListener(APPLY_DRAFT_EVENT, handleDraftChange);
  }, [key]);

  const update = useCallback(
    (patch: Partial<ApplyDraft> | ((prev: ApplyDraft) => Partial<ApplyDraft>)) => {
      setDraft((prev) => {
        const resolved = typeof patch === "function" ? patch(prev) : patch;
        const next: ApplyDraft = {
          ...prev,
          ...resolved,
          updatedAt: new Date().toISOString(),
        };
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage unavailable/full — draft still works for this session
        }
        queueMicrotask(() => notifyDraftChange(key, next));
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setDraft(DEFAULT_APPLY_DRAFT);
    notifyDraftChange(key, DEFAULT_APPLY_DRAFT);
  }, [key]);

  return { draft, update, clear, hydrated };
}
