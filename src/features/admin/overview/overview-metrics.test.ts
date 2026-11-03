import { describe, expect, it } from "vitest";
import { WAIT_CRITICAL_MS } from "~/features/requests/requests-table.utils";
import {
  BUBBLE_MAX_RADIUS,
  BUBBLE_MIN_RADIUS,
  LONGEST_WAIT_LIMIT,
  bubbleRadius,
  summarizeOpenRequests,
  summarizeServices,
  summarizeTeam,
  type OpenRequestRow,
} from "./overview-metrics";

const NOW = Date.parse("2026-10-23T08:00:00+08:00");
const DAY = 24 * 60 * 60 * 1000;

function request(overrides: Partial<OpenRequestRow> = {}): OpenRequestRow {
  return {
    id: crypto.randomUUID(),
    trackingNumber: "CCRO-2026-000001",
    serviceName: "Marriage license",
    status: "submitted",
    paymentStatus: "unpaid",
    updatedAt: new Date(NOW - DAY).toISOString(),
    ...overrides,
  };
}

describe("summarizeOpenRequests", () => {
  it("counts open requests per stage and leaves finished ones out", () => {
    const summary = summarizeOpenRequests(
      [
        request({ status: "submitted" }),
        request({ status: "under_validation" }),
        request({ status: "incomplete" }),
        request({ status: "processing" }),
        request({ status: "ready_for_release" }),
        request({ status: "released" }),
        request({ status: "rejected" }),
      ],
      NOW,
    );

    expect(summary.openTotal).toBe(5);
    expect(summary.stages.map((stage) => stage.count)).toEqual([1, 2, 1, 1]);
  });

  it("ignores a status it does not know", () => {
    const summary = summarizeOpenRequests([request({ status: "mystery" })], NOW);
    expect(summary.openTotal).toBe(0);
  });

  it("counts only requests whose move is the staff's as waiting on staff", () => {
    const summary = summarizeOpenRequests(
      [
        request({ status: "submitted" }),
        request({ status: "incomplete" }),
        request({ status: "ready_for_release", paymentStatus: "unpaid" }),
        request({ status: "ready_for_release", paymentStatus: "verified" }),
      ],
      NOW,
    );
    expect(summary.waitingOnStaff).toBe(2);
  });

  it("flags a long wait only once it reaches the queue's critical wait", () => {
    const justUnder = new Date(NOW - WAIT_CRITICAL_MS + 1000).toISOString();
    const exactly = new Date(NOW - WAIT_CRITICAL_MS).toISOString();
    const summary = summarizeOpenRequests(
      [
        request({ status: "submitted", updatedAt: justUnder }),
        request({ status: "submitted", updatedAt: exactly }),
      ],
      NOW,
    );
    expect(summary.longWaitTotal).toBe(1);
    expect(summary.stages[0].longWaits).toBe(1);
  });

  it("does not flag a wait that is the applicant's or the cashier's", () => {
    const old = new Date(NOW - 65 * DAY).toISOString();
    const summary = summarizeOpenRequests(
      [
        request({ status: "incomplete", updatedAt: old }),
        request({ status: "ready_for_release", paymentStatus: "unpaid", updatedAt: old }),
      ],
      NOW,
    );
    expect(summary.longWaitTotal).toBe(0);
  });

  it("lists the longest waits first, capped, and counts them all", () => {
    const rows = Array.from({ length: LONGEST_WAIT_LIMIT + 3 }, (_, index) =>
      request({
        trackingNumber: `CCRO-2026-${index}`,
        updatedAt: new Date(NOW - (10 + index) * DAY).toISOString(),
      }),
    );
    const summary = summarizeOpenRequests(rows, NOW);

    expect(summary.longest).toHaveLength(LONGEST_WAIT_LIMIT);
    expect(summary.longWaitTotal).toBe(LONGEST_WAIT_LIMIT + 3);
    expect(summary.longest[0].days).toBe(10 + LONGEST_WAIT_LIMIT + 2);
    expect(summary.longest.map((wait) => wait.days)).toEqual(
      [...summary.longest.map((wait) => wait.days)].sort((a, b) => b - a),
    );
  });

  it("carries no applicant details into the long-wait list", () => {
    const summary = summarizeOpenRequests(
      [request({ updatedAt: new Date(NOW - 9 * DAY).toISOString() })],
      NOW,
    );
    expect(Object.keys(summary.longest[0]).sort()).toEqual([
      "days",
      "id",
      "serviceName",
      "status",
      "trackingNumber",
    ]);
  });
});

describe("bubbleRadius", () => {
  it("gives the fullest stage the largest bubble", () => {
    expect(bubbleRadius(460, 460)).toBe(BUBBLE_MAX_RADIUS);
    expect(bubbleRadius(20, 20)).toBe(BUBBLE_MAX_RADIUS);
  });

  it("keeps an empty stage at the smallest bubble, which still holds its icon", () => {
    expect(bubbleRadius(0, 460)).toBe(BUBBLE_MIN_RADIUS);
    expect(bubbleRadius(0, 0)).toBe(BUBBLE_MIN_RADIUS);
  });

  it("draws the same picture at any scale", () => {
    expect(bubbleRadius(5, 20)).toBe(bubbleRadius(250, 1000));
    expect(bubbleRadius(4, 20)).toBe(bubbleRadius(920, 4600));
  });

  it("grows with the count and never leaves its bounds", () => {
    const radii = [0, 1, 4, 18, 20, 500].map((count) => bubbleRadius(count, 20));
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    for (const radius of radii) {
      expect(radius).toBeGreaterThanOrEqual(BUBBLE_MIN_RADIUS);
      expect(radius).toBeLessThanOrEqual(BUBBLE_MAX_RADIUS);
    }
  });

  it("sizes by area, so a quarter of the count is half the extra width", () => {
    const quarter = bubbleRadius(5, 20) - BUBBLE_MIN_RADIUS;
    const full = bubbleRadius(20, 20) - BUBBLE_MIN_RADIUS;
    expect(quarter).toBeCloseTo(full / 2, 0);
  });
});

describe("summarizeTeam", () => {
  it("counts the CCRO team and leaves other roles out", () => {
    const team = summarizeTeam([
      { role: "staff", status: "active", confirmed: true },
      { role: "admin", status: "active", confirmed: true },
      { role: "cashier", status: "active", confirmed: true },
      { role: "applicant", status: "active", confirmed: true },
      { role: "system_admin", status: "active", confirmed: true },
    ]);
    expect(team).toEqual({ total: 3, invited: 0, inactive: 0 });
  });

  it("tells a pending invitation from a deactivated account", () => {
    const team = summarizeTeam([
      { role: "staff", status: "active", confirmed: false },
      { role: "supervisor", status: "deactivated", confirmed: true },
      { role: "staff", status: "suspended", confirmed: true },
      { role: "cashier", status: "active", confirmed: true },
    ]);
    expect(team).toEqual({ total: 4, invited: 1, inactive: 2 });
  });

  it("counts a deactivated person who never accepted as inactive, not invited", () => {
    const team = summarizeTeam([
      { role: "staff", status: "deactivated", confirmed: false },
    ]);
    expect(team).toEqual({ total: 1, invited: 0, inactive: 1 });
  });
});

describe("summarizeServices", () => {
  it("splits services by classification and groups the rest", () => {
    expect(
      summarizeServices([
        "simple",
        "simple",
        "complex",
        "highly_technical",
        null,
      ]),
    ).toEqual({ total: 5, simple: 2, complex: 1, other: 2 });
  });
});
