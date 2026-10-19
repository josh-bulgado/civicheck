import { describe, expect, it } from "vitest";
import {
  RETURNABLE_TO_VALIDATION,
  canTransition,
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
