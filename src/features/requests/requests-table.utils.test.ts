import { describe, expect, it } from "vitest";

import {
  WAIT_CRITICAL_MS,
  WAIT_WARNING_MS,
  countByStage,
  countNeedingStaff,
  filterRequests,
  formatTimeInStage,
  matchesDepartment,
  matchesSearch,
  needsStaff,
  paymentDisplay,
  requestTurn,
  waitTone,
  waitingRank,
} from "./requests-table.utils";
import type { StaffRequestRow } from "./requests.queries";

const NOW = Date.parse("2026-10-21T09:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function request(overrides: Partial<StaffRequestRow> = {}): StaffRequestRow {
  return {
    id: "1",
    trackingNumber: "CCRO-2026-482913",
    status: "submitted",
    paymentStatus: "unpaid",
    serviceName: "Birth Certificate",
    departmentId: "records",
    departmentName: "Records",
    applicantName: "Rowena Balmes",
    feesDue: 150,
    isWalkIn: false,
    createdAt: "2026-10-20T00:00:00Z",
    updatedAt: new Date(NOW - 5 * HOUR).toISOString(),
    ...overrides,
  };
}

describe("requestTurn", () => {
  it("gives validation and processing to staff", () => {
    for (const status of ["submitted", "under_validation", "processing"]) {
      expect(requestTurn({ status, paymentStatus: "unpaid" })).toBe("staff");
    }
  });

  it("leaves an incomplete request with the applicant", () => {
    expect(requestTurn({ status: "incomplete", paymentStatus: "unpaid" })).toBe(
      "applicant",
    );
  });

  it("hands a ready request to staff only once payment is verified", () => {
    expect(
      requestTurn({ status: "ready_for_release", paymentStatus: "verified" }),
    ).toBe("staff");
    expect(
      requestTurn({ status: "ready_for_release", paymentStatus: "unpaid" }),
    ).toBe("payment");
  });

  it("has nobody waiting on a closed request", () => {
    for (const status of ["released", "rejected"]) {
      expect(requestTurn({ status, paymentStatus: "verified" })).toBe("none");
    }
  });

  it("agrees with needsStaff", () => {
    expect(needsStaff({ status: "processing", paymentStatus: "unpaid" })).toBe(true);
    expect(needsStaff({ status: "incomplete", paymentStatus: "unpaid" })).toBe(false);
  });
});

describe("matchesSearch", () => {
  const row = request();

  it("matches everything when the query is blank", () => {
    expect(matchesSearch(row, "")).toBe(true);
    expect(matchesSearch(row, "   ")).toBe(true);
  });

  it("matches tracking number, applicant or service, ignoring case", () => {
    expect(matchesSearch(row, "482913")).toBe(true);
    expect(matchesSearch(row, "rowena")).toBe(true);
    expect(matchesSearch(row, "BIRTH")).toBe(true);
    expect(matchesSearch(row, "marriage")).toBe(false);
  });
});

describe("matchesDepartment", () => {
  it("matches a department by id and the unassigned sentinel", () => {
    expect(matchesDepartment(request(), undefined)).toBe(true);
    expect(matchesDepartment(request(), "records")).toBe(true);
    expect(matchesDepartment(request(), "registration")).toBe(false);
    expect(matchesDepartment(request({ departmentId: null }), "unassigned")).toBe(true);
    expect(matchesDepartment(request(), "unassigned")).toBe(false);
  });
});

describe("filterRequests", () => {
  const rows = [
    request({ id: "a", status: "submitted" }),
    request({ id: "b", status: "incomplete", applicantName: "Eduardo Llanes" }),
    request({ id: "c", status: "processing", paymentStatus: "verified" }),
    request({ id: "d", status: "ready_for_release", departmentId: "registration" }),
  ];
  const ids = (found: StaffRequestRow[]) => found.map((row) => row.id);

  it("returns everything with no criteria", () => {
    expect(ids(filterRequests(rows, {}))).toEqual(["a", "b", "c", "d"]);
  });

  it("narrows by stage and by status", () => {
    expect(ids(filterRequests(rows, { stage: 2 }))).toEqual(["b"]);
    expect(ids(filterRequests(rows, { status: "processing" }))).toEqual(["c"]);
  });

  it("treats unpaid as not yet verified", () => {
    expect(ids(filterRequests(rows, { payment: "unpaid" }))).toEqual(["a", "b", "d"]);
    expect(ids(filterRequests(rows, { payment: "verified" }))).toEqual(["c"]);
  });

  it("keeps only requests waiting on staff for Needs you", () => {
    expect(ids(filterRequests(rows, { needs: true }))).toEqual(["a", "c"]);
  });

  it("combines every filter", () => {
    expect(
      ids(filterRequests(rows, { needs: true, stage: 3, search: "rowena" })),
    ).toEqual(["c"]);
    expect(ids(filterRequests(rows, { department: "registration", search: "eduardo" }))).toEqual([]);
  });
});

describe("countByStage", () => {
  it("counts every stage and the total", () => {
    const counts = countByStage([
      request({ status: "submitted" }),
      request({ status: "under_validation" }),
      request({ status: "incomplete" }),
      request({ status: "processing" }),
      request({ status: "released" }),
    ]);
    expect(counts).toEqual({ all: 5, 1: 1, 2: 2, 3: 1, 4: 1 });
  });
});

describe("countNeedingStaff", () => {
  it("skips requests that are with the applicant or closed", () => {
    expect(
      countNeedingStaff([
        request({ status: "submitted" }),
        request({ status: "incomplete" }),
        request({ status: "released", paymentStatus: "verified" }),
        request({ status: "ready_for_release", paymentStatus: "verified" }),
      ]),
    ).toBe(2);
  });
});

describe("formatTimeInStage", () => {
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it.each([
    [0, "0m"],
    [60_000 - 1, "0m"],
    [60_000, "1m"],
    [10 * 60_000 + 42_000, "10m"],
    [HOUR - 1, "59m"],
    [HOUR, "1h"],
    [2 * HOUR - 1, "1h"],
    [2 * HOUR, "2h"],
    [5 * HOUR, "5h"],
    [DAY - 1, "23h"],
    [DAY, "1d"],
    [DAY + HOUR - 1, "1d"],
    [DAY + HOUR, "1d 1h"],
    [DAY + 5 * HOUR, "1d 5h"],
    [40 * HOUR, "1d 16h"],
    [2 * DAY - 1, "1d 23h"],
    [2 * DAY, "2d"],
    [2 * DAY + 5 * HOUR, "2d"],
    [3 * DAY, "3d"],
    [4.9 * DAY, "4d"],
  ])("formats %i elapsed milliseconds as %s", (elapsed, expected) => {
    expect(formatTimeInStage(ago(elapsed), NOW)).toBe(expected);
  });

  it("never goes negative when the clock is behind", () => {
    expect(formatTimeInStage(ago(-HOUR), NOW)).toBe("0m");
  });
});

describe("waitTone", () => {
  const waiting = (ms: number, status = "processing") =>
    request({ status, updatedAt: new Date(NOW - ms).toISOString() });

  it("stays normal for a short wait on staff", () => {
    expect(waitTone(waiting(DAY), NOW)).toBe("normal");
  });

  it("turns warning and then critical as a staff wait grows", () => {
    expect(waitTone(waiting(WAIT_WARNING_MS), NOW)).toBe("warning");
    expect(waitTone(waiting(WAIT_CRITICAL_MS), NOW)).toBe("critical");
  });

  it("never colours a wait that is not staff's", () => {
    expect(waitTone(waiting(10 * DAY, "incomplete"), NOW)).toBe("quiet");
    expect(waitTone(waiting(10 * DAY, "released"), NOW)).toBe("quiet");
  });
});

describe("waitingRank", () => {
  it("ranks staff work above the applicant's and closed requests", () => {
    const staff = request({ status: "processing" });
    const applicant = request({ status: "incomplete" });
    const closed = request({ status: "released", paymentStatus: "verified" });
    expect(waitingRank(staff)).toBeGreaterThan(waitingRank(applicant));
    expect(waitingRank(applicant)).toBeGreaterThan(waitingRank(closed));
  });

  it("ranks the longer wait higher within a turn", () => {
    const older = request({ updatedAt: new Date(NOW - 4 * DAY).toISOString() });
    const newer = request({ updatedAt: new Date(NOW - HOUR).toISOString() });
    expect(waitingRank(older)).toBeGreaterThan(waitingRank(newer));
  });
});

describe("paymentDisplay", () => {
  it("is quiet until the applicant has been told to pay", () => {
    for (const status of ["submitted", "under_validation", "incomplete"]) {
      expect(paymentDisplay({ status, paymentStatus: "unpaid" })).toBe("not_due");
    }
  });

  it("reads unpaid from processing onward", () => {
    expect(paymentDisplay({ status: "processing", paymentStatus: "unpaid" })).toBe("unpaid");
    expect(paymentDisplay({ status: "ready_for_release", paymentStatus: "unpaid" })).toBe("unpaid");
  });

  it("reads verified whenever payment is settled", () => {
    expect(paymentDisplay({ status: "processing", paymentStatus: "verified" })).toBe("verified");
    expect(paymentDisplay({ status: "released", paymentStatus: "verified" })).toBe("verified");
  });

  it("has nothing to say about a rejected request", () => {
    expect(paymentDisplay({ status: "rejected", paymentStatus: "unpaid" })).toBe("none");
  });
});
