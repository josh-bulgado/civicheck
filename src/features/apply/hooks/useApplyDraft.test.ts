import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APPLY_DRAFT,
  discardDraftAt,
  draftHasProgress,
  reopenDraftAt,
  updateDraftAt,
  type ApplyDraft,
} from "./useApplyDraft";

function draft(overrides: Partial<ApplyDraft> = {}): ApplyDraft {
  return { ...DEFAULT_APPLY_DRAFT, updatedAt: "2026-10-29T00:00:00.000Z", ...overrides };
}

const person = {
  role: "Subject",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  sex: "",
};

describe("draftHasProgress", () => {
  it("is false for a draft nobody has touched", () => {
    expect(draftHasProgress(DEFAULT_APPLY_DRAFT)).toBe(false);
  });

  it("is false when the wizard only picked the service's single option", () => {
    // This is what opening a one-option service writes, with nothing typed.
    expect(draftHasProgress(draft({ selectedServiceCode: "BIRTH_ONTIME" }))).toBe(false);
    expect(draftHasProgress(draft({ serviceName: "Birth Certificate" }))).toBe(false);
  });

  it("is false for blank people and the default purpose", () => {
    expect(draftHasProgress(draft({ subjects: [person] }))).toBe(false);
    expect(
      draftHasProgress(draft({ answers: { purpose: DEFAULT_APPLY_DRAFT.answers.purpose } })),
    ).toBe(false);
    expect(draftHasProgress(draft({ answers: { event_place: "   " } }))).toBe(false);
  });

  it("is true once a variant was chosen", () => {
    expect(draftHasProgress(draft({ caseSelectorAnswers: { age: "0-79" } }))).toBe(true);
  });

  it("is true once a name or an answer was typed", () => {
    expect(draftHasProgress(draft({ subjects: [{ ...person, firstName: "Ana" }] }))).toBe(true);
    expect(draftHasProgress(draft({ answers: { event_place: "Legazpi" } }))).toBe(true);
    expect(draftHasProgress(draft({ answers: { purpose: "Passport" } }))).toBe(true);
    expect(
      draftHasProgress(draft({ answers: { subjects: [{ ...person, lastName: "Reyes" }] } })),
    ).toBe(true);
  });

  it("is true once a file was uploaded", () => {
    const document = {
      requirementId: "r1",
      requirementName: "Valid ID",
      subjectRole: null,
      storagePath: "u/1.pdf",
      fileName: "1.pdf",
      fileSize: 10,
      uploadedAt: "2026-10-29T00:00:00.000Z",
    };
    expect(draftHasProgress(draft({ documents: [document] }))).toBe(true);
  });

  it("is false for anything without a save time, whatever it holds", () => {
    expect(draftHasProgress({ ...DEFAULT_APPLY_DRAFT, caseSelectorAnswers: { a: "b" } })).toBe(
      false,
    );
  });
});

describe("discarding an application", () => {
  const store = new Map<string, string>();
  const KEY = "civicheck.applications.me.BIRTH";
  const OTHER = "civicheck.applications.me.MARRIAGE";

  beforeEach(() => {
    store.clear();
    vi.stubGlobal(
      "window",
      Object.assign(new EventTarget(), {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => void store.set(key, value),
          removeItem: (key: string) => void store.delete(key),
          key: (index: number) => [...store.keys()][index] ?? null,
          get length() {
            return store.size;
          },
        },
      }),
    );
    reopenDraftAt(KEY);
    reopenDraftAt(OTHER);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("takes writes until it is discarded", () => {
    expect(updateDraftAt(KEY, { selectedServiceCode: "BIRTH_ONTIME" })).toBe(true);
    expect(JSON.parse(store.get(KEY)!)).toMatchObject({ selectedServiceCode: "BIRTH_ONTIME" });
  });

  it("stays gone when the step writes its default back afterwards", () => {
    updateDraftAt(KEY, { answers: { event_place: "Legazpi" } });
    discardDraftAt(KEY);
    expect(store.has(KEY)).toBe(false);

    // The single-option step selecting its only service, right after the click.
    expect(updateDraftAt(KEY, { selectedServiceCode: "BIRTH_ONTIME" })).toBe(false);
    expect(store.has(KEY)).toBe(false);
  });

  it("stays gone when an upload lands afterwards", () => {
    discardDraftAt(KEY);
    const landed = updateDraftAt(KEY, (previous) => ({
      documents: [...previous.documents],
    }));
    expect(landed).toBe(false);
    expect(store.has(KEY)).toBe(false);
  });

  it("does not hold back another application", () => {
    discardDraftAt(KEY);
    expect(updateDraftAt(OTHER, { selectedServiceCode: "MARRIAGE_LICENSE" })).toBe(true);
    expect(store.has(OTHER)).toBe(true);
  });

  it("takes writes again once the wizard is reopened", () => {
    discardDraftAt(KEY);
    reopenDraftAt(KEY);
    expect(updateDraftAt(KEY, { selectedServiceCode: "BIRTH_ONTIME" })).toBe(true);
    expect(store.has(KEY)).toBe(true);
  });
});
