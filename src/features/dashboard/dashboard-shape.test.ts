import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_SHAPE,
  dashboardShape,
  parseDashboardShape,
  readDashboardShape,
  rememberDashboardShape,
  type DashboardShape,
} from "./dashboard-shape";
import { dashboardPlan } from "./hero";
import type { CitizenDashboardRequest } from "./types";

let counter = 0;
function request(
  status: string,
  overrides: Partial<CitizenDashboardRequest> = {},
): CitizenDashboardRequest {
  counter += 1;
  return {
    id: `r${counter}`,
    tracking_number: `CC-${counter}`,
    request_type: "BIRTH",
    status,
    payment_status: "unpaid",
    // Later requests are newer, so the plan's order is the order they are made.
    created_at: new Date(Date.UTC(2026, 9, 1, 0, counter)).toISOString(),
    fees_due: 0,
    application_logs: [],
    ...overrides,
  };
}

function shapeOf(requests: CitizenDashboardRequest[]): DashboardShape {
  return dashboardShape(requests.length > 0, dashboardPlan(requests));
}

describe("dashboardShape", () => {
  it("is the 'What do you need today?' page for an applicant with no requests", () => {
    expect(shapeOf([])).toEqual({ kind: "empty" });
  });

  it.each([
    // Submission is finished the day it is made; Validation has not started.
    ["submitted", true, 1],
    ["under_validation", false, 1],
    ["incomplete", false, 1],
    ["processing", true, 2],
    ["ready_for_release", false, 3],
    // Through every stage: all four are drawn finished.
    ["released", false, 4],
  ])("draws a %s request's card: line under headline %s, %i stage(s) done", (status, lead, done) => {
    expect(shapeOf([request(status)])).toMatchObject({
      kind: "requests",
      hero: { lead, done },
      attention: 0,
      rows: 0,
    });
  });

  it("counts the stages that carry a caption", () => {
    // A submitted request only says it was received.
    expect(shapeOf([request("submitted")])).toMatchObject({ hero: { captioned: 1 } });

    // Later, each finished stage has its date and the current one its note.
    const logs = [
      { action_status: "under_validation", created_at: "2026-10-02T00:00:00Z" },
      { action_status: "processing", created_at: "2026-10-03T00:00:00Z" },
    ];
    const shape = shapeOf([request("processing", { application_logs: logs })]);
    expect(shape).toMatchObject({ hero: { captioned: 3 } });
  });

  it("adds a pill under the stage only where the tracker draws one", () => {
    const tag = (r: CitizenDashboardRequest) =>
      shapeOf([r]).kind === "requests" &&
      (shapeOf([r]) as { hero: { tag: boolean } }).hero.tag;

    expect(tag(request("incomplete"))).toBe(true);
    expect(tag(request("under_validation"))).toBe(false);
    // Ready for release: "Pay at cashier", but only when a fee is owed.
    expect(tag(request("ready_for_release", { fees_due: 150 }))).toBe(true);
    expect(tag(request("ready_for_release", { fees_due: 0 }))).toBe(false);
    expect(
      tag(request("ready_for_release", { fees_due: 150, payment_status: "verified" })),
    ).toBe(false);
  });

  it("counts the cards under the hero the way the page lists them", () => {
    const shape = shapeOf([
      request("processing"),
      request("incomplete"),
      request("under_validation"),
      request("submitted"),
    ]);
    // The incomplete one leads; the other incomplete-or-ready ones need
    // attention (none here), and the two newest still-moving ones are the rows.
    expect(shape).toMatchObject({ kind: "requests", attention: 0, rows: 2 });
    expect(shape).toMatchObject({ hero: { lead: false, done: 1 } });
  });

  it("leads with the released request, and lists the other finished ones, when nothing is moving", () => {
    expect(shapeOf([request("released"), request("released")])).toMatchObject({
      kind: "requests",
      hero: { lead: false, done: 4, tag: false },
      attention: 0,
      rows: 1,
    });
  });

  it("keeps the 'nothing in progress' card when every request was rejected", () => {
    expect(shapeOf([request("rejected")])).toEqual({
      kind: "requests",
      hero: null,
      attention: 0,
      rows: 1,
    });
  });
});

describe("parseDashboardShape", () => {
  it("accepts what dashboardShape writes", () => {
    for (const shape of [
      EMPTY_SHAPE,
      shapeOf([request("processing"), request("incomplete")]),
      shapeOf([request("released")]),
      shapeOf([request("rejected")]),
    ]) {
      expect(parseDashboardShape(JSON.parse(JSON.stringify(shape)))).toEqual(shape);
    }
  });

  it("refuses anything out of range or of the wrong kind", () => {
    for (const value of [
      null,
      "empty",
      {},
      { kind: "other" },
      { kind: "requests", hero: null, attention: 9, rows: 0 },
      { kind: "requests", hero: null, attention: 0, rows: -1 },
      { kind: "requests", hero: null, attention: 0.5, rows: 0 },
      { kind: "requests", hero: { lead: "yes", done: 1, captioned: 1, tag: false }, attention: 0, rows: 0 },
      { kind: "requests", hero: { lead: true, done: 5, captioned: 1, tag: false }, attention: 0, rows: 0 },
      { kind: "requests", hero: { lead: true, done: 1, captioned: 5, tag: false }, attention: 0, rows: 0 },
      { kind: "requests", hero: { lead: true, done: 1, captioned: 1 }, attention: 0, rows: 0 },
      { kind: "requests", attention: 0, rows: 0 },
    ]) {
      expect(parseDashboardShape(value)).toBeNull();
    }
  });
});

describe("remembering the shape", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is kept per person", () => {
    const mine = shapeOf([request("processing")]);
    rememberDashboardShape("me", mine);

    expect(readDashboardShape("me")).toEqual(mine);
    expect(readDashboardShape("someone-else")).toBeNull();
  });

  it("ignores a stored value it cannot trust", () => {
    store.set("civicheck.dashboard-shape.me", "{not json");
    expect(readDashboardShape("me")).toBeNull();

    store.set("civicheck.dashboard-shape.me", JSON.stringify({ kind: "requests" }));
    expect(readDashboardShape("me")).toBeNull();
  });

  it("falls back to unknown when storage throws", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("blocked");
      },
    });
    expect(readDashboardShape("me")).toBeNull();
    expect(() => rememberDashboardShape("me", EMPTY_SHAPE)).not.toThrow();
  });

  it("is unknown outside the browser", () => {
    vi.unstubAllGlobals();
    expect(readDashboardShape("me")).toBeNull();
  });
});
