import { describe, expect, it } from "vitest";
import { formatAuditEventType, matchesAuditSearch } from "./audit-event.utils";
import type { NormalizedAuditEvent } from "./system-admin.types";

const event: NormalizedAuditEvent = {
  id: "event-1",
  source: "sign-in",
  eventType: "admin_session_started",
  actorId: "profile-123",
  actor: "CiviCheck System Admin",
  targetId: null,
  requestId: null,
  timestamp: "2026-10-25T16:29:28Z",
  deviceLabel: "Chrome on Windows",
  maskedIpAddress: "127.0.0.0",
};

describe("audit search", () => {
  it("finds either an actor or an event, without requiring both to match", () => {
    expect(matchesAuditSearch(event, "SYSTEM ADMIN")).toBe(true);
    expect(matchesAuditSearch(event, "Admin Session Started")).toBe(true);
    expect(matchesAuditSearch(event, "health check")).toBe(false);
  });

  it("accepts raw event codes and normalizes spacing", () => {
    expect(matchesAuditSearch(event, " admin_session_started ")).toBe(true);
    expect(matchesAuditSearch(event, "admin   session")).toBe(true);
  });

  it("retains profile id searches and handles system actors without ids", () => {
    expect(matchesAuditSearch(event, "profile-123")).toBe(true);
    expect(matchesAuditSearch({ ...event, actorId: null }, "unrelated")).toBe(
      false,
    );
    expect(matchesAuditSearch({ ...event, actorId: null }, "  ")).toBe(true);
  });

  it("keeps device and target metadata out of the actor/event search", () => {
    expect(matchesAuditSearch(event, "Chrome")).toBe(false);
    expect(
      matchesAuditSearch({ ...event, targetId: "target-456" }, "target-456"),
    ).toBe(false);
  });
});

it("renders event codes as readable titles", () => {
  expect(formatAuditEventType("health_check_run")).toBe("Health Check Run");
  expect(formatAuditEventType("account.updated")).toBe("Account Updated");
});
