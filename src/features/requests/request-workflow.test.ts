import { describe, expect, it } from "vitest";
import {
  RETURNABLE_TO_VALIDATION,
  canTransition,
  getRejectionNotice,
  getRejectionReason,
  getTransitionLabel,
  nextStatuses,
} from "./request-workflow";

describe("returning a request to validation", () => {
  it("lets a request in processing or release go back to under validation", () => {
    for (const from of ["processing", "ready_for_release"]) {
      expect(canTransition(from, "under_validation")).toBe(true);
      expect(nextStatuses(from)).toContain("under_validation");
      expect(RETURNABLE_TO_VALIDATION).toContain(from);
    }
  });

  it("still never skips ahead or reopens a finished request", () => {
    expect(canTransition("under_validation", "ready_for_release")).toBe(false);
    expect(canTransition("released", "under_validation")).toBe(false);
    expect(canTransition("rejected", "under_validation")).toBe(false);
    expect(RETURNABLE_TO_VALIDATION).not.toContain("released");
    expect(RETURNABLE_TO_VALIDATION).not.toContain("rejected");
  });

  it("words the hop as a return only when it starts after validation", () => {
    expect(getTransitionLabel("processing", "under_validation")).toBe(
      "Return to validation",
    );
    expect(getTransitionLabel("ready_for_release", "under_validation")).toBe(
      "Return to validation",
    );
    expect(getTransitionLabel("submitted", "under_validation")).toBe(
      "Start validation",
    );
    expect(getTransitionLabel("incomplete", "under_validation")).toBe(
      "Start validation",
    );
  });
});

describe("the reason a request was rejected", () => {
  const rejected = (remarks: string | null) => ({ actionStatus: "rejected", remarks });
  const generic = "Your request could not be accepted.";

  it("is the newest rejection's remark, as staff typed it", () => {
    const reason = "No matching record could be found at the CCRO.";

    expect(
      getRejectionReason([
        { actionStatus: "submitted", remarks: "Request submitted online." },
        rejected("An older reason."),
        rejected(reason),
      ]),
    ).toBe(reason);
  });

  it("is null when the rejection carries no reason of its own", () => {
    for (const remarks of [
      null,
      "",
      'Advanced from "Under Validation".',
      "Moved from under_validation to rejected.",
      generic,
    ]) {
      expect(getRejectionReason([rejected(remarks)])).toBeNull();
    }
  });

  it("ignores the notes on every other status change, and a request never rejected", () => {
    expect(
      getRejectionReason([{ actionStatus: "incomplete", remarks: "Bring a valid ID." }]),
    ).toBeNull();
    expect(getRejectionReason([])).toBeNull();
  });

  it("is told as the plain statement, then the reason when there is one", () => {
    expect(getRejectionNotice([rejected("The details do not match.")])).toBe(
      `${generic} The details do not match.`,
    );
    expect(getRejectionNotice([rejected(null)])).toBe(generic);
    expect(getRejectionNotice([])).toBe(generic);
  });
});
