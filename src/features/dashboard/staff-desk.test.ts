import { describe, expect, it } from "vitest";
import { WAIT_CRITICAL_MS } from "~/features/requests/requests-table.utils";
import {
  DESK_LIST_LIMIT,
  describeWait,
  summarizeStaffDesk,
  type DeskSourceRow,
} from "./staff-desk";

const NOW = Date.parse("2026-10-24T09:00:00+08:00");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function request(overrides: Partial<DeskSourceRow> = {}): DeskSourceRow {
  return {
    id: crypto.randomUUID(),
    trackingNumber: "CCRO-2026-000001",
    applicantName: "Maria Santos",
    serviceName: "On-Time Registration of Certificate of Live Birth",
    status: "submitted",
    paymentStatus: "unpaid",
    updatedAt: new Date(NOW - DAY).toISOString(),
    ...overrides,
  };
}

function waitingFor(ms: number, overrides: Partial<DeskSourceRow> = {}) {
  return request({ updatedAt: new Date(NOW - ms).toISOString(), ...overrides });
}

describe("describeWait", () => {
  it("uses the queue's figure and words that agree with the number", () => {
    expect(describeWait(new Date(NOW - 3 * DAY).toISOString(), NOW)).toMatchObject({
      short: "3d",
      value: "3",
      unit: "days",
      spoken: "3 days",
    });
    expect(describeWait(new Date(NOW - 30 * HOUR).toISOString(), NOW)).toMatchObject({
      short: "30h",
      unit: "hours",
    });
    expect(describeWait(new Date(NOW - 1 * HOUR).toISOString(), NOW)).toMatchObject({
      short: "1h",
      unit: "hour",
      spoken: "1 hour",
    });
  });

  it("says under an hour for a fresh request", () => {
    expect(describeWait(new Date(NOW - 60_000).toISOString(), NOW)).toMatchObject({
      short: "<1h",
      value: "<1",
      unit: "hour",
      spoken: "under 1 hour",
    });
  });
});

describe("summarizeStaffDesk", () => {
  it("counts open requests per stage and leaves finished ones out", () => {
    const desk = summarizeStaffDesk(
      [
        request({ status: "submitted" }),
        request({ status: "under_validation" }),
        request({ status: "incomplete" }),
        request({ status: "ready_for_release", paymentStatus: "verified" }),
        request({ status: "ready_for_release", paymentStatus: "unpaid" }),
        request({ status: "released" }),
        request({ status: "rejected" }),
      ],
      NOW,
    );

    expect(desk.openTotal).toBe(5);
    expect(desk.stages.map((stage) => stage.count)).toEqual([1, 2, 0, 2]);
  });

  it("lists only what is the staff's move, longest wait first", () => {
    const old = waitingFor(7 * DAY, { trackingNumber: "OLD" });
    const fresh = waitingFor(HOUR, { trackingNumber: "FRESH" });
    const paid = waitingFor(5 * DAY, {
      trackingNumber: "PAID",
      status: "ready_for_release",
      paymentStatus: "verified",
    });
    const desk = summarizeStaffDesk(
      [
        fresh,
        waitingFor(9 * DAY, { status: "incomplete" }),
        waitingFor(8 * DAY, { status: "ready_for_release", paymentStatus: "unpaid" }),
        old,
        paid,
      ],
      NOW,
    );

    expect(desk.yoursTotal).toBe(3);
    expect(desk.yours.map((r) => r.trackingNumber)).toEqual(["OLD", "PAID", "FRESH"]);
  });

  it("names only the first few and still counts the rest", () => {
    const rows = Array.from({ length: DESK_LIST_LIMIT + 3 }, (_, i) =>
      waitingFor((i + 1) * HOUR),
    );
    const desk = summarizeStaffDesk(rows, NOW);

    expect(desk.yoursTotal).toBe(DESK_LIST_LIMIT + 3);
    expect(desk.yours).toHaveLength(DESK_LIST_LIMIT);
  });

  it("colours a wait only while the move is the staff's", () => {
    const desk = summarizeStaffDesk(
      [
        waitingFor(WAIT_CRITICAL_MS + HOUR, { trackingNumber: "STAFF" }),
        waitingFor(WAIT_CRITICAL_MS + HOUR, {
          trackingNumber: "THEIRS",
          status: "incomplete",
        }),
      ],
      NOW,
    );

    expect(desk.yours[0].tone).toBe("critical");
    expect(desk.applicant.oldest?.tone).toBe("quiet");
  });

  it("flags long waits and the oldest wait per stage, on staff only", () => {
    const desk = summarizeStaffDesk(
      [
        waitingFor(7 * DAY, { status: "submitted" }),
        waitingFor(2 * DAY, { status: "submitted" }),
        waitingFor(6 * DAY, { status: "under_validation" }),
        // Waited longest, but with the applicant, so it is not a long wait on staff.
        waitingFor(20 * DAY, { status: "incomplete" }),
      ],
      NOW,
    );

    const [intake, validation, processing] = desk.stages;
    expect(intake).toMatchObject({ count: 2, longWaits: 1 });
    expect(intake.oldest?.short).toBe("7d");
    expect(validation).toMatchObject({ count: 2, longWaits: 1 });
    expect(validation.oldest?.short).toBe("6d");
    expect(processing).toMatchObject({ count: 0, longWaits: 0, oldest: null });
  });

  it("holds the applicant's and the cashier's requests apart, oldest first", () => {
    const desk = summarizeStaffDesk(
      [
        waitingFor(2 * DAY, { status: "incomplete", trackingNumber: "NEWER" }),
        waitingFor(4 * DAY, { status: "incomplete", trackingNumber: "OLDER" }),
        waitingFor(DAY, {
          status: "ready_for_release",
          paymentStatus: "unpaid",
          trackingNumber: "CASH",
        }),
      ],
      NOW,
    );

    expect(desk.applicant.total).toBe(2);
    expect(desk.applicant.oldest?.trackingNumber).toBe("OLDER");
    expect(desk.cashier).toMatchObject({ total: 1 });
    expect(desk.cashier.oldest?.trackingNumber).toBe("CASH");
    expect(desk.yoursTotal).toBe(0);
  });

  it("is empty when there is nothing open", () => {
    const desk = summarizeStaffDesk([request({ status: "released" })], NOW);

    expect(desk.openTotal).toBe(0);
    expect(desk.yours).toEqual([]);
    expect(desk.applicant).toEqual({ total: 0, oldest: null });
    expect(desk.cashier).toEqual({ total: 0, oldest: null });
  });
});
