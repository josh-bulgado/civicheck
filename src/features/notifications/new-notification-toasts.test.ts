import { describe, expect, it } from "vitest";
import type { RealtimeRowEvent } from "~/hooks/useRealtimeRefresh";
import type { NotificationRow } from "~/features/notifications/notifications.queries";
import { addToast, isNewArrival } from "./new-notification-toasts";

const NOW = Date.parse("2026-10-20T08:00:00Z");

function event(overrides: Partial<RealtimeRowEvent> & { row?: Record<string, unknown> }): RealtimeRowEvent {
  return {
    table: "notifications",
    eventType: "INSERT",
    ...overrides,
    row: { is_read: false, archived_at: null, ...overrides.row },
  };
}

function notification(id: string): NotificationRow {
  return {
    id,
    requestId: "r1",
    type: "status_change",
    archivedAt: null,
    subject: "Request CCRO-1: now Processing",
    body: "",
    status: "sent",
    isRead: false,
    sentAt: "2026-10-20T08:00:00Z",
    trackingNumber: "CCRO-1",
    serviceName: "Birth Certificate",
    target: { to: "/my-requests/$requestId", requestId: "r1" },
  };
}

describe("isNewArrival", () => {
  it("counts every unread insert", () => {
    expect(isNewArrival(event({}), NOW)).toBe(true);
    expect(isNewArrival(event({ table: "staff_notifications" }), NOW)).toBe(true);
  });

  it("ignores an insert that is already read or archived", () => {
    expect(isNewArrival(event({ row: { is_read: true } }), NOW)).toBe(false);
    expect(isNewArrival(event({ row: { archived_at: "2026-10-20T07:00:00Z" } }), NOW)).toBe(false);
  });

  it("ignores updates to an applicant notification", () => {
    const update = event({ eventType: "UPDATE", row: { created_at: "2026-10-20T08:00:00Z" } });
    expect(isNewArrival(update, NOW)).toBe(false);
  });

  it("counts a staff alert that was refreshed in place a moment ago", () => {
    const refreshed = event({
      table: "staff_notifications",
      eventType: "UPDATE",
      row: { created_at: "2026-10-20T07:59:58Z" },
    });
    expect(isNewArrival(refreshed, NOW)).toBe(true);
  });

  it("ignores a staff update that is only read, unread or archive of an old row", () => {
    const old = event({
      table: "staff_notifications",
      eventType: "UPDATE",
      row: { created_at: "2026-10-20T07:00:00Z" },
    });
    expect(isNewArrival(old, NOW)).toBe(false);
    expect(isNewArrival({ ...old, row: { ...old.row, is_read: true } }, NOW)).toBe(false);
  });

  it("ignores deletes and rows with no timestamp", () => {
    expect(isNewArrival(event({ eventType: "DELETE", row: {} }), NOW)).toBe(false);
    const noStamp = event({ table: "staff_notifications", eventType: "UPDATE" });
    expect(isNewArrival(noStamp, NOW)).toBe(false);
  });
});

describe("addToast", () => {
  it("stacks the newest last", () => {
    const stack = addToast(addToast([], notification("a"), 1), notification("b"), 2);
    expect(stack.map((t) => t.notification.id)).toEqual(["a", "b"]);
  });

  it("keeps older notifications when more than three arrive", () => {
    let stack = addToast([], notification("a"), 1);
    for (const [key, id] of [[2, "b"], [3, "c"], [4, "d"]] as const) {
      stack = addToast(stack, notification(id), key);
    }
    expect(stack.map((t) => t.notification.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("replaces a repeat of the same notification and moves it to the end", () => {
    let stack = addToast([], notification("a"), 1);
    stack = addToast(stack, notification("b"), 2);
    stack = addToast(stack, notification("a"), 3);
    expect(stack.map((t) => [t.notification.id, t.key])).toEqual([
      ["b", 2],
      ["a", 3],
    ]);
  });
});
