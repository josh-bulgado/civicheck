import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { useRouteContext } from "@tanstack/react-router";
import type { SubjectFields } from "~/lib/subject-fields";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import { clampCopies } from "~/features/services/service-utils";

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
  /**
   * What to call this application on the dashboard ("Marriage License"). Written
   * by the wizard once the draft has anything in it; null until then.
   */
  serviceName: string | null;
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
  /** How many copies to issue. Only used when the service is charged per copy. */
  copies: number;
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
  serviceName: null,
  selectedServiceCode: null,
  uploadDraftId: null,
  caseSelectorAnswers: {},
  presetAge: null,
  presetMarital: null,
  subjects: [],
  answers: {
    purpose: "Local Use (ID, Barangay, etc.)",
  },
  copies: 1,
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

// The delayed-birth form used to store the informant's relationship as the
// display text ("Mother"); the shared birth-details block stores the lowercase
// option value ("mother"), as the on-time form always did. A draft saved before
// that change would otherwise point at an option that no longer exists.
const LEGACY_INFORMANT_VALUES: Record<string, string> = {
  Mother: "mother",
  Father: "father",
  Grandparent: "grandparent",
  Guardian: "guardian",
  "Physician / Midwife": "physician_midwife",
  Other: "other",
};

function normalizeInformantRelationship<T>(value: T): T | string {
  return typeof value === "string"
    ? (LEGACY_INFORMANT_VALUES[value] ?? value)
    : value;
}

function withMigratedAnswers(value: Partial<ApplyDraft>): ApplyDraft {
  const legacyCase = value.caseAnswers ?? DEFAULT_APPLY_DRAFT.caseAnswers;
  const migrated = {
    ...DEFAULT_APPLY_DRAFT,
    ...value,
    caseSelectorAnswers: value.caseSelectorAnswers ?? {},
    // Drafts saved before copies existed have no value; storage is untrusted too.
    copies: clampCopies(value.copies ?? 1),
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
  return {
    ...migrated,
    answers: {
      ...migrated.answers,
      informant_relationship: normalizeInformantRelationship(
        migrated.answers.informant_relationship,
      ),
    },
  };
}

// A draft holds a person's answers and the paths of the files staged for them,
// and `localStorage` belongs to the browser, not the account. Every key carries
// the account it belongs to, so signing in as someone else never reads,
// continues or overwrites the previous person's application.
const DRAFT_PREFIX = "civicheck.applications.";
/** Outside the signed-in app there is no account; those drafts get their own bucket. */
const GUEST_OWNER = "guest";
/**
 * Drafts saved before they were kept per account. Nothing says whose they are,
 * so none is handed to whoever signs in next: they are removed instead.
 */
const LEGACY_PREFIX = "civicheck.apply.";

function ownerPrefix(owner: string | null) {
  return `${DRAFT_PREFIX}${owner ?? GUEST_OWNER}.`;
}

function storageKey(owner: string | null, groupOrCode: string) {
  return `${ownerPrefix(owner)}${groupOrCode}`;
}

/** The account whose drafts this component reads and writes. */
function useApplyDraftOwner(): string | null {
  const { user } = useRouteContext({ from: "__root__" });
  return user?.id ?? null;
}

let legacyPurged = false;

function purgeLegacyDrafts() {
  if (legacyPurged || typeof window === "undefined") return;
  legacyPurged = true;
  try {
    const stale: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(LEGACY_PREFIX)) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // storage unavailable: there is nothing to purge
  }
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
  purgeLegacyDrafts();
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

export type DraftPatch =
  | Partial<ApplyDraft>
  | ((prev: ApplyDraft) => Partial<ApplyDraft>);

/**
 * Applications the applicant has just discarded. The wizard stays mounted until
 * the page they are heading to has loaded, and in that gap a step can still
 * write: the one that selects a service's only option as soon as the draft is
 * empty, or an upload that was on its way and lands after the click. Either
 * would bring the draft back, and with it "Continue your application". A
 * discarded application takes no more writes until the wizard is opened again.
 */
const discardedKeys = new Set<string>();

/** Applies a patch. False when the application was discarded, so nothing was written. */
export function updateDraftAt(key: string, patch: DraftPatch): boolean {
  if (discardedKeys.has(key)) return false;
  const prev = readDraft(key);
  const resolved = typeof patch === "function" ? patch(prev) : patch;
  writeDraft(key, {
    ...prev,
    ...resolved,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

function clearDraftAt(key: string) {
  draftCache.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
  // A fresh object — see the note in `readDraft` on why this can't be the
  // `SERVER_DRAFT` singleton.
  notifyDraftChange(key, { ...DEFAULT_APPLY_DRAFT });
}

/** Removes the application and refuses writes to it until `reopenDraftAt`. */
export function discardDraftAt(key: string) {
  discardedKeys.add(key);
  clearDraftAt(key);
}

/** The wizard is open on this application again: it takes writes. */
export function reopenDraftAt(key: string) {
  discardedKeys.delete(key);
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
 * Not bound to a key: this fires once, outside of any component reading it.
 */
function seedDraftForGroup(
  owner: string | null,
  groupOrCode: string,
  seed: Partial<ApplyDraft>,
) {
  const next: ApplyDraft = {
    ...withMigratedAnswers(seed),
    updatedAt: new Date().toISOString(),
  };
  writeDraft(storageKey(owner, groupOrCode), next);
}

/** `seedDraftForGroup` for the signed-in account. */
export function useSeedDraftForGroup() {
  const owner = useApplyDraftOwner();
  return useCallback(
    (groupOrCode: string, seed: Partial<ApplyDraft>) =>
      seedDraftForGroup(owner, groupOrCode, seed),
    [owner],
  );
}

/**
 * Clears which service the applicant had picked — the case-selector answers,
 * the resolved service and any redirect presets — while leaving the rest of the
 * saved draft (names, answers, uploads) alone.
 *
 * Called when an application is started from the service directory. A draft
 * is kept per service, so without this a returning applicant lands on the case
 * step with last time's choices already ticked, and a new application reads as
 * if someone else had answered for them. Moving between wizard steps never
 * calls this, so Back and Edit keep every answer.
 */
function resetApplyChoices(owner: string | null, groupOrCode: string) {
  const key = storageKey(owner, groupOrCode);
  const previous = readDraft(key);
  const hasChoices =
    previous.selectedServiceCode !== null ||
    Object.keys(previous.caseSelectorAnswers).length > 0 ||
    previous.presetAge !== null ||
    previous.presetMarital !== null;
  if (!hasChoices) return;
  writeDraft(key, {
    ...previous,
    selectedServiceCode: null,
    caseSelectorAnswers: {},
    presetAge: null,
    presetMarital: null,
    updatedAt: new Date().toISOString(),
  });
}

/** `resetApplyChoices` for the signed-in account. */
export function useResetApplyChoices() {
  const owner = useApplyDraftOwner();
  return useCallback(
    (groupOrCode: string) => resetApplyChoices(owner, groupOrCode),
    [owner],
  );
}

// ─── An application left unfinished on this device ───────────────────────────

export interface ContinuableApplication {
  /** `display_group ?? service_code`: what the apply route is keyed on. */
  routeCode: string;
  serviceName: string | null;
  updatedAt: string;
}

const DEFAULT_PURPOSE = DEFAULT_APPLY_DRAFT.answers.purpose;

function hasName(person: { firstName: string; lastName: string }) {
  return person.firstName.trim() !== "" || person.lastName.trim() !== "";
}

/**
 * Whether a draft holds anything of the applicant's own: a variant they chose,
 * an answer or name they typed, a file they uploaded. What the wizard fills in
 * by itself does not count. A service with a single option has it selected the
 * moment the wizard opens, and that alone is no reason to offer "Continue your
 * application", or to ask whether to keep a draft on the way out.
 */
export function draftHasProgress(draft: ApplyDraft): boolean {
  if (draft.updatedAt === null) return false;
  return (
    Object.keys(draft.caseSelectorAnswers).length > 0 ||
    draft.documents.length > 0 ||
    draft.subjects.some(hasName) ||
    Object.entries(draft.answers).some(([key, value]) =>
      typeof value === "string"
        ? value.trim() !== "" && !(key === "purpose" && value === DEFAULT_PURPOSE)
        : value.some(hasName),
    )
  );
}

/** This account's most recently touched unfinished application on this device, or null. */
function readContinuableApplication(owner: string | null): ContinuableApplication | null {
  const prefix = ownerPrefix(owner);
  let latest: ContinuableApplication | null = null;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const draft = readDraft(key);
      if (!draftHasProgress(draft) || !draft.updatedAt) continue;
      if (!latest || draft.updatedAt > latest.updatedAt) {
        latest = {
          routeCode: key.slice(prefix.length),
          serviceName: draft.serviceName,
          updatedAt: draft.updatedAt,
        };
      }
    }
  } catch {
    // storage unavailable: there is simply nothing to continue
  }
  return latest;
}

// `useSyncExternalStore` needs the same object back while nothing changed, or it
// re-renders forever; the signature says whether anything did.
let continuableSignature = "";
let continuableValue: ContinuableApplication | null = null;

function snapshotContinuable(owner: string | null): ContinuableApplication | null {
  const next = readContinuableApplication(owner);
  // The owner is part of the signature: the same draft under another account is
  // a different answer, and a stale one must never be handed back.
  const signature = next
    ? `${owner}|${next.routeCode}|${next.updatedAt}|${next.serviceName}`
    : "";
  if (signature !== continuableSignature) {
    continuableSignature = signature;
    continuableValue = next;
  }
  return continuableValue;
}

function subscribeToAnyDraft(onStoreChange: () => void) {
  window.addEventListener(APPLY_DRAFT_EVENT, onStoreChange);
  // Another tab of this site finished or discarded the application.
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(APPLY_DRAFT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** What the server (and hydration) hands back: storage has not been read yet. */
const NOT_READ = Symbol("continuable-application-not-read");

/**
 * The application to offer "Continue" for, if there is one.
 *
 * Drafts live in this browser's storage, which the server cannot see, so the
 * server render and the first client render do not know. `ready` is false for
 * those two; `application` is null then, but that means "not read yet", not
 * "nothing to continue". A page that would otherwise show the answer a beat
 * late holds a skeleton until `ready`. On a client-side navigation the draft is
 * read straight away and `ready` is true from the first render.
 */
export function useContinuableApplication(): {
  application: ContinuableApplication | null;
  ready: boolean;
} {
  const owner = useApplyDraftOwner();
  const getSnapshot = useCallback(() => snapshotContinuable(owner), [owner]);
  const snapshot = useSyncExternalStore<ContinuableApplication | null | typeof NOT_READ>(
    subscribeToAnyDraft,
    getSnapshot,
    () => NOT_READ,
  );
  return snapshot === NOT_READ
    ? { application: null, ready: false }
    : { application: snapshot, ready: true };
}

export function useApplyDraft(groupOrCode: string) {
  const owner = useApplyDraftOwner();
  const key = storageKey(owner, groupOrCode);

  const draft = useSyncExternalStore(
    useCallback((onStoreChange) => subscribeToDraft(key, onStoreChange), [key]),
    () => readDraft(key),
    () => SERVER_DRAFT,
  );
  // Reference equality with the shared SSR sentinel — true once this
  // component has taken the client's `getSnapshot` branch.
  const hydrated = draft !== SERVER_DRAFT;

  // A wizard that opens is a fresh session on this application, so an earlier
  // discard no longer blocks it. Every layout effect in the tree runs before any
  // effect that writes the draft, so this is lifted in time for the first step.
  useLayoutEffect(() => {
    reopenDraftAt(key);
  }, [key]);

  /** False when the application was just discarded and nothing was written. */
  const update = useCallback((patch: DraftPatch) => updateDraftAt(key, patch), [key]);

  /** Empties the draft once it is done with: submitted, or handed to another track. */
  const clear = useCallback(() => clearDraftAt(key), [key]);

  /** The applicant threw the application away: it stays gone until the wizard reopens. */
  const discard = useCallback(() => discardDraftAt(key), [key]);

  return { draft, update, clear, discard, hydrated };
}

/**
 * Discards an application from outside its wizard (the dashboard's card).
 * Returns the id of its staged uploads, for the caller to have the server drop
 * the files, or null when it had none.
 */
export function useDiscardApplication() {
  const owner = useApplyDraftOwner();
  return useCallback(
    (groupOrCode: string) => {
      const key = storageKey(owner, groupOrCode);
      const uploadDraftId = readDraft(key).uploadDraftId;
      clearDraftAt(key);
      return uploadDraftId;
    },
    [owner],
  );
}
