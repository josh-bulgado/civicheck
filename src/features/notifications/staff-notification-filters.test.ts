import { describe, expect, it } from "vitest";
import type {
  NotificationRow,
  NotificationType,
} from "~/features/notifications/notifications.queries";
import {
  countNotifications,
  filterNotifications,
  matchesSearch,
  needsAction,
} from "./staff-notification-filters";

function row(overrides: Partial<NotificationRow> & { id: string }): NotificationRow {
  const trackingNumber = overrides.trackingNumber ?? "CCRO-2026-001091";
  return {
    requestId: "r1",
    type: "new_request",
    archivedAt: null,
    subject: `Request ${trackingNumber}: new request`,
    body: "On-Time Registration of Certificate of Live Birth was submitted.",
    status: "sent",
    isRead: false,
    sentAt: "2026-10-23T01:58:00Z",
    trackingNumber,
    serviceName: null,
    target: { to: "/requests/$requestId", requestId: "r1" },
    ...overrides,
  };
}

const ITEMS = [
  row({ id: "new" }),
  row({ id: "resubmitted", type: "document_resubmitted", trackingNumber: "CCRO-2026-001088" }),
  row({ id: "cashier", type: "awaiting_cashier", trackingNumber: "CCRO-2026-001084" }),
  row({ id: "released", type: "ready_to_release", trackingNumber: "CCRO-2026-001074" }),
  row({ id: "read", isRead: true, trackingNumber: "CCRO-2026-001061" }),
  row({ id: "archived", archivedAt: "2026-10-14T02:12:00Z", isRead: true }),
];

const ids = (items: NotificationRow[]) => items.map((item) => item.id);

describe("needsAction", () => {
  it.each<NotificationType>([
    "new_request",
    "document_resubmitted",
    "new_message",
    "awaiting_cashier",
  ])("counts an unread %s alert", (type) => {
    expect(needsAction(row({ id: "x", type }))).toBe(true);
  });

  it.each<NotificationType>(["ready_to_release", "request_incomplete", "request_rejected"])(
    "leaves %s to the admins as news",
    (type) => {
      expect(needsAction(row({ id: "x", type }))).toBe(false);
    },
  );

  it("drops an alert once it is read or archived", () => {
    expect(needsAction(row({ id: "x", isRead: true }))).toBe(false);
    expect(needsAction(row({ id: "x", archivedAt: "2026-10-14T00:00:00Z" }))).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("matches the tracking number, ignoring case and padding", () => {
    expect(matchesSearch(ITEMS[1], "  ccro-2026-001088 ")).toBe(true);
    expect(matchesSearch(ITEMS[1], "001091")).toBe(false);
  });

  it("matches the title and the body", () => {
    expect(matchesSearch(ITEMS[0], "new request")).toBe(true);
    expect(matchesSearch(ITEMS[0], "live birth")).toBe(true);
  });

  it("matches everything when the search is empty", () => {
    expect(matchesSearch(ITEMS[0], "   ")).toBe(true);
  });
});

describe("countNotifications", () => {
  it("counts the inbox, unread, archived and needs-action rows", () => {
    expect(countNotifications(ITEMS)).toEqual({ all: 5, unread: 4, archived: 1, needs: 3 });
  });
});

describe("filterNotifications", () => {
  const base = { filter: "all", needsOnly: false, search: "" } as const;

  it("keeps archived rows out of All and Unread", () => {
    expect(ids(filterNotifications(ITEMS, base))).toEqual([
      "new",
      "resubmitted",
      "cashier",
      "released",
      "read",
    ]);
    expect(ids(filterNotifications(ITEMS, { ...base, filter: "unread" }))).toEqual([
      "new",
      "resubmitted",
      "cashier",
      "released",
    ]);
  });

  it("shows only archived rows under Archived", () => {
    expect(ids(filterNotifications(ITEMS, { ...base, filter: "archived" }))).toEqual([
      "archived",
    ]);
  });

  it("combines Needs You with the chip and the search", () => {
    expect(ids(filterNotifications(ITEMS, { ...base, needsOnly: true }))).toEqual([
      "new",
      "resubmitted",
      "cashier",
    ]);
    expect(
      ids(filterNotifications(ITEMS, { ...base, needsOnly: true, search: "001084" })),
    ).toEqual(["cashier"]);
    expect(
      ids(filterNotifications(ITEMS, { ...base, filter: "archived", needsOnly: true })),
    ).toEqual([]);
  });
});
