import { describe, expect, it } from "vitest";
import {
  dashboardPlan,
  heroHeadline,
  heroLead,
  heroServiceLabel,
  leadCaptions,
  trackerDetails,
  trackerProgress,
} from "./hero";
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

  it("dates all four stages of a released request, Release by its own log", () => {
    const captions = leadCaptions(
      request("released", [
        { action_status: "under_validation", created_at: "2026-10-21T02:00:00Z" },
        { action_status: "processing", created_at: "2026-10-22T03:00:00Z" },
        { action_status: "ready_for_release", created_at: "2026-10-23T03:00:00Z" },
        { action_status: "released", created_at: "2026-10-27T03:00:00Z" },
      ]),
    );

    expect(Object.keys(captions)).toEqual(["1", "2", "3", "4"]);
    // The date, not the sentence a request in Release is given.
    expect(captions[4]).toMatch(/27/);
    expect(captions[4]).not.toMatch(/released/i);
  });

  it("leaves Release undated when its log is missing, rather than guessing", () => {
    const captions = leadCaptions(request("released"));

    expect(captions[1]).toBeTruthy();
    expect(captions[4]).toBeUndefined();
  });
});

describe("trackerProgress", () => {
  it.each([
    ["submitted", 1, null],
    ["under_validation", 1, 2],
    ["incomplete", 1, 2],
    ["processing", 2, 3],
    ["ready_for_release", 3, 4],
    // Through every stage, so none is "here".
    ["released", 4, null],
  ])("draws a %s request with %i stage(s) done, here: %s", (status, done, here) => {
    expect(trackerProgress(status)).toEqual({ done, here });
  });
});

describe("a released request, whichever service it was for", () => {
  const services = [
    { label: "a long registry name", short_name: null, name: "Email Assisted-Online Inquiry/Verification for Birth, Death and Marriage Certificates" },
    { label: "a service with a short name", short_name: "Birth Certificate", name: "On-Time Registration of Certificate of Live Birth" },
    { label: "a bare request type", short_name: null, name: undefined },
  ];

  it.each(services)("leads the dashboard, $label", ({ short_name, name }) => {
    const released = {
      ...request("released"),
      short_name,
      services_registry: name ? { name, display_name: null } : undefined,
    } as CitizenDashboardRequest;

    const plan = dashboardPlan([released]);
    expect(plan.hero?.id).toBe("r1");
    expect(heroServiceLabel(released)).toBeTruthy();
    expect(heroHeadline("released")).toEqual({ verb: "is", emphasis: "released" });
  });

  it("says the same for a free request and a paid one", () => {
    for (const fees_due of [0, 150]) {
      const plan = dashboardPlan([{ ...request("released"), fees_due, payment_status: "verified" }]);
      expect(plan.hero?.status).toBe("released");
      expect(trackerDetails(plan.hero!).tag).toBeNull();
    }
  });
});

// A request made on `day` of October 2026: a bigger day is a newer request.
function made(
  id: string,
  status: string,
  day: number,
  extra: Partial<CitizenDashboardRequest> = {},
): CitizenDashboardRequest {
  return {
    ...request(status),
    id,
    created_at: `2026-10-${String(day).padStart(2, "0")}T01:00:00Z`,
    ...extra,
  };
}

const ids = (requests: CitizenDashboardRequest[]) => requests.map((r) => r.id);

describe("dashboardPlan: who leads", () => {
  it("leads with the request that needs the applicant, not the newest", () => {
    const plan = dashboardPlan([
      made("new", "processing", 9),
      made("old", "incomplete", 1),
    ]);

    expect(plan.hero?.id).toBe("old");
  });

  it("falls back to the newest request still moving", () => {
    const plan = dashboardPlan([
      made("a", "under_validation", 2),
      made("b", "submitted", 5),
      made("c", "released", 9),
    ]);

    expect(plan.hero?.id).toBe("b");
  });
});

describe("dashboardPlan: the rows under the hero", () => {
  it("keeps finished requests out of the rows while others are still moving", () => {
    const plan = dashboardPlan([
      made("hero", "submitted", 2),
      made("moving", "processing", 1),
      made("done1", "released", 10),
      made("done2", "released", 11),
    ]);

    expect(ids(plan.rows)).toEqual(["moving"]);
    expect(plan.rowsHeading).toBe("Your other requests");
    expect(plan.hasMore).toBe(false);
  });

  it("shows two rows, newest first, and points at the full list for the rest", () => {
    const plan = dashboardPlan([
      made("a", "processing", 1),
      made("b", "processing", 2),
      made("c", "processing", 3),
      made("d", "processing", 4),
    ]);

    expect(plan.hero?.id).toBe("d");
    expect(ids(plan.rows)).toEqual(["c", "b"]);
    expect(plan.hasMore).toBe(true);
  });

  it("does not point at the list when every request fits", () => {
    const plan = dashboardPlan([
      made("a", "processing", 1),
      made("b", "processing", 2),
      made("c", "processing", 3),
    ]);

    expect(plan.rows).toHaveLength(2);
    expect(plan.hasMore).toBe(false);
  });
});

describe("dashboardPlan: needs your attention", () => {
  it("names other incomplete requests, then ones waiting at the cashier", () => {
    const plan = dashboardPlan([
      made("hero", "incomplete", 5),
      made("pay", "ready_for_release", 6, { fees_due: 150 }),
      made("fix", "incomplete", 4),
    ]);

    expect(ids(plan.attention.map((item) => item.request))).toEqual(["fix", "pay"]);
    expect(plan.rows).toEqual([]);
  });

  it("caps the card at three, and an active request it has no room for joins the rows", () => {
    const plan = dashboardPlan([
      made("hero", "incomplete", 9),
      made("i1", "incomplete", 8),
      made("i2", "incomplete", 7),
      made("i3", "incomplete", 6),
      made("i4", "incomplete", 5),
    ]);

    expect(plan.attention).toHaveLength(3);
    expect(ids(plan.rows)).toEqual(["i4"]);
    expect(plan.hasMore).toBe(false);
  });
});

describe("dashboardPlan: a rejection", () => {
  const rejected = made("no", "rejected", 3);

  it("shows in the card until the applicant has opened it", () => {
    const hero = made("hero", "processing", 5);

    const unopened = dashboardPlan([hero, rejected], new Set(["no"]));
    expect(ids(unopened.attention.map((item) => item.request))).toEqual(["no"]);
    expect(unopened.rows).toEqual([]);

    const opened = dashboardPlan([hero, rejected], new Set());
    expect(opened.attention).toEqual([]);
    expect(opened.rows).toEqual([]);
  });

  it("is named once when it is all the applicant has, not repeated as a row", () => {
    const plan = dashboardPlan([rejected], new Set(["no"]));

    expect(plan.hero).toBeNull();
    expect(ids(plan.attention.map((item) => item.request))).toEqual(["no"]);
    expect(plan.rows).toEqual([]);
  });

  it("points at the list when a full card leaves one out and no row can", () => {
    const plan = dashboardPlan(
      [
        made("hero", "incomplete", 9),
        made("i1", "incomplete", 8),
        made("i2", "incomplete", 7),
        made("i3", "incomplete", 6),
        rejected,
      ],
      new Set(["no"]),
    );

    expect(ids(plan.attention.map((item) => item.request))).toEqual(["i1", "i2", "i3"]);
    expect(plan.rows).toEqual([]);
    expect(plan.hasMore).toBe(true);
  });
});

describe("dashboardPlan: nothing in progress", () => {
  it("leads with the latest released request, and lists the finished ones after it", () => {
    const plan = dashboardPlan([
      made("old", "released", 1),
      made("mid", "rejected", 2),
      made("new", "released", 3),
    ]);

    expect(plan.hero?.id).toBe("new");
    expect(plan.rowsHeading).toBe("Recent requests");
    expect(ids(plan.rows)).toEqual(["mid", "old"]);
    expect(plan.hasMore).toBe(false);
  });

  it("points at the full list when more finished requests are left out", () => {
    const plan = dashboardPlan([
      made("a", "released", 1),
      made("b", "released", 2),
      made("c", "released", 3),
      made("d", "released", 4),
    ]);

    expect(plan.hero?.id).toBe("d");
    expect(ids(plan.rows)).toEqual(["c", "b"]);
    expect(plan.hasMore).toBe(true);
  });

  it("does not lead with a rejected request", () => {
    const plan = dashboardPlan([made("a", "rejected", 1), made("b", "rejected", 2)]);

    expect(plan.hero).toBeNull();
    expect(plan.rowsHeading).toBe("Recent requests");
    expect(ids(plan.rows)).toEqual(["b", "a"]);
  });

  it("gives way to a request that is moving again", () => {
    const plan = dashboardPlan([made("done", "released", 1), made("new", "submitted", 5)]);

    expect(plan.hero?.id).toBe("new");
    expect(plan.rowsHeading).toBe("Your other requests");
    expect(plan.rows).toEqual([]);
  });

  it("has nothing to show for an applicant with no requests", () => {
    const plan = dashboardPlan([]);

    expect(plan.hero).toBeNull();
    expect(plan.attention).toEqual([]);
    expect(plan.rows).toEqual([]);
    expect(plan.hasMore).toBe(false);
  });
});

describe("a rejection's reason on the card", () => {
  const log = (remarks: string | null, createdAt = "2026-10-12T01:00:00Z") => ({
    action_status: "rejected",
    created_at: createdAt,
    remarks,
  });
  const hero = made("hero", "processing", 5);
  const messageFor = (rejected: CitizenDashboardRequest) =>
    dashboardPlan([hero, rejected], new Set([rejected.id])).attention[0]?.message;

  it("quotes the reason staff gave, after the plain statement", () => {
    const reason = "The details provided do not match the records on file.";
    const rejected = made("no", "rejected", 3, { application_logs: [log(reason)] });

    expect(messageFor(rejected)).toBe(`Your request could not be accepted. ${reason}`);
  });

  it("uses the newest rejection when the logs arrive out of order", () => {
    const rejected = made("no", "rejected", 3, {
      application_logs: [
        log("The newer reason.", "2026-10-14T01:00:00Z"),
        log("The older reason.", "2026-10-10T01:00:00Z"),
      ],
    });

    expect(messageFor(rejected)).toBe("Your request could not be accepted. The newer reason.");
  });

  it("says only that it was not accepted when no reason was recorded", () => {
    const plain = "Your request could not be accepted.";

    expect(messageFor(made("no", "rejected", 3, { application_logs: [log(null)] }))).toBe(plain);
    expect(messageFor(made("no", "rejected", 3))).toBe(plain);
  });
});

describe("the Release caption and payment", () => {
  const release = (extra: Partial<CitizenDashboardRequest>) =>
    leadCaptions(made("r", "ready_for_release", 5, extra))[4];

  it("tells the applicant to bring the fee when one is owed", () => {
    expect(release({ fees_due: 150, payment_status: "unpaid" })).toBe(
      "Bring your original documents and ₱150.00 to pay at the CCRO counter",
    );
    // Fees are stored as numeric text by the database.
    expect(release({ fees_due: "1100", payment_status: null })).toContain("₱1,100.00");
  });

  it("says nothing about payment for a free request", () => {
    expect(release({ fees_due: 0, payment_status: "unpaid" })).toBe(
      "Bring your original documents to the CCRO counter",
    );
    expect(release({ fees_due: null, payment_status: "unpaid" })).not.toMatch(/pay|₱/i);
  });

  it("says nothing about payment once the cashier has verified it", () => {
    expect(release({ fees_due: 150, payment_status: "verified" })).toBe(
      "Bring your original documents to the CCRO counter",
    );
  });
});
