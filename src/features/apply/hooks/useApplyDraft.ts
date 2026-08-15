import { useCallback, useEffect, useState } from "react";

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
  details: {
    subjectFirstName: string;
    subjectMiddleName: string;
    subjectLastName: string;
    subjectSuffix: string;
    eventDate: string;
    eventPlace: string;
  };
  caseAnswers: {
    purpose: string;
    otherPurpose: string;
    additionalNotes: string;
  };
  documents: ApplyDraftDocument[];
  updatedAt: string | null;
}

export const DEFAULT_APPLY_DRAFT: ApplyDraft = {
  selectedServiceCode: null,
  details: {
    subjectFirstName: "",
    subjectMiddleName: "",
    subjectLastName: "",
    subjectSuffix: "",
    eventDate: "",
    eventPlace: "",
  },
  caseAnswers: {
    purpose: "Local Use (ID, Barangay, etc.)",
    otherPurpose: "",
    additionalNotes: "",
  },
  documents: [],
  updatedAt: null,
};

function storageKey(groupOrCode: string) {
  return `civicheck.apply.${groupOrCode}`;
}

export function useApplyDraft(groupOrCode: string) {
  const key = storageKey(groupOrCode);
  const [draft, setDraft] = useState<ApplyDraft>(DEFAULT_APPLY_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setDraft({ ...DEFAULT_APPLY_DRAFT, ...JSON.parse(raw) });
    } catch {
      // corrupt or unavailable draft — start fresh
    }
    setHydrated(true);
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
  }, [key]);

  return { draft, update, clear, hydrated };
}
