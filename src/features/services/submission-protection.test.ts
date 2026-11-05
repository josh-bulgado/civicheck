import { describe, expect, it } from "vitest";
import { sameRequestDetails, sameRequestSubjects } from "./submission-protection";

const person = { subject_first_name: "Ana", subject_middle_name: "", subject_last_name: "Reyes" };
describe("possible duplicate subjects", () => {
  it("ignores capitalization and repeated spaces", () => {
    expect(sameRequestSubjects(person, { ...person, subject_first_name: " ANA  " })).toBe(true);
  });
  it("does not confuse family members or missing subjects", () => {
    expect(sameRequestSubjects(person, { ...person, subject_first_name: "Maria" })).toBe(false);
    expect(sameRequestSubjects({}, {})).toBe(false);
  });
  it("compares all marriage parties and suffixes", () => {
    const couple = { ...person, party2_first_name: "Juan", party2_last_name: "Cruz", party2_suffix: "Jr." };
    expect(sameRequestSubjects(couple, { ...couple })).toBe(true);
    expect(sameRequestSubjects(couple, { ...couple, party2_first_name: "Jose" })).toBe(false);
    expect(sameRequestSubjects(couple, { ...couple, party2_suffix: "" })).toBe(false);
    expect(sameRequestSubjects(person, couple)).toBe(false);
  });
  it("treats record type as a detail rather than a different person", () => {
    expect(sameRequestSubjects({ ...person, record_type: "birth" }, { ...person, record_type: "death" })).toBe(true);
  });
});

describe("identical application details", () => {
  const details = {
    ...person, event_date: "2000-01-01", event_place: "Legazpi",
    requester_address: "Barangay One", mother_name: "Maria Reyes", record_type: "birth",
  };
  it("blocks the same answers despite new signatures or signing times", () => {
    expect(sameRequestDetails(
      { ...details, requester_signature: "new", requester_signed_at: "today" },
      { ...details, requester_signature: "old", requester_signed_at: "yesterday" },
    )).toBe(true);
  });
  it("ignores capitalization, whitespace, and absent optional blanks", () => {
    expect(sameRequestDetails(
      { ...details, event_place: " LEGAZPI  ", purpose_other: "" },
      details,
    )).toBe(true);
  });
  it.each(["event_date", "event_place", "requester_address", "mother_name", "record_type"])(
    "recognizes a different %s as a separate application detail", (key) => {
      expect(sameRequestDetails(details, { ...details, [key]: "different" })).toBe(false);
    },
  );
  it("recognizes different copy quantities", () => {
    expect(sameRequestDetails(details, details, 2, 1)).toBe(false);
  });
  it("recognizes a newly answered field", () => {
    expect(sameRequestDetails(details, { ...details, reference_number: "123" })).toBe(false);
  });
});
