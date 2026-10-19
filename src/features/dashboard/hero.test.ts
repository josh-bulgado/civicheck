import { describe, expect, it } from "vitest";
import { heroLead, leadCaptions } from "./hero";
import type { CitizenDashboardRequest } from "./types";

function request(
  status: string,
  logs: { action_status: string; created_at: string }[] = [],
): CitizenDashboardRequest {
  return {
    id: "r1",
    tracking_number: "CC-1",
    request_type: "BIRTH",
    status,
    payment_status: "unpaid",
    created_at: "2026-10-20T01:00:00Z",
    fees_due: 0,
    application_logs: logs,
  };
}

describe("heroLead", () => {
  const label = "On-Time Registration of Certificate of Live Birth";

  it("gives a submitted request its short headline and review line", () => {
    expect(heroLead("submitted", label)).toEqual({
      headline: "Your request has been submitted",
      line: `${label} application is in review.`,
    });
  });

  it("gives a processing request the same shape, in processing words", () => {
    expect(heroLead("processing", label)).toEqual({
      headline: "Your request is being processed",
      line: `${label} application is being prepared.`,
    });
  });

  it("leaves every other status on the usual \"Your … is …\" headline", () => {
    for (const status of [
      "under_validation",
      "incomplete",
      "ready_for_release",
      "none",
    ]) {
      expect(heroLead(status, label)).toBeNull();
    }
  });
});

describe("leadCaptions", () => {
  it("says a just-submitted request was received, and nothing else", () => {
    expect(leadCaptions(request("submitted"))).toEqual({
      1: "Application received",
    });
  });

  it("dates the finished stages and notes the one a processing request is in", () => {
    const captions = leadCaptions(
      request("processing", [
        { action_status: "under_validation", created_at: "2026-10-20T02:00:00Z" },
        { action_status: "processing", created_at: "2026-10-20T03:00:00Z" },
      ]),
    );

    expect(captions[1]).toBeTruthy();
    expect(captions[2]).toBeTruthy();
    expect(captions[3]).toMatch(/preparing your record/i);
    expect(captions[4]).toBeUndefined();
  });
});

describe("leadCaptions for the other states", () => {
  it("notes the stage an under-review request is in, with Submission dated", () => {
    const captions = leadCaptions(request("under_validation"));

    expect(captions[1]).toBeTruthy();
    expect(captions[2]).toBeTruthy();
    expect(captions[3]).toBeUndefined();
  });

  it("says what an incomplete request still needs", () => {
    expect(leadCaptions(request("incomplete"))[2]).toBe("One more document needed");
  });
});
