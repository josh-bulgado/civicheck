import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCurrentUser } from "~/features/auth/current-user";
import {
  AUDIT_CACHE_TTL_MS,
  AUDIT_CACHE_RETENTION_MS,
  clearAuditEventsCache,
  invalidateAuditEventsCache,
  peekAuditEvents,
  readAuditEvents,
} from "./audit-events.cache";
import type { AuditEventsResult } from "./system-admin.types";

function result(actor = "System Admin"): AuditEventsResult {
  return {
    events: [
      {
        id: actor,
        source: "system",
        eventType: "health_check_run",
        actorId: "admin",
        actor,
        targetId: null,
        requestId: null,
        timestamp: "2026-10-26T00:00:00Z",
        deviceLabel: null,
        maskedIpAddress: null,
      },
    ],
    total: 1,
    filters: { source: "all" },
  };
}

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
  clearAuditEventsCache();
});

afterEach(() => {
  clearAuditEventsCache();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("audit event cache", () => {
  it("serves retained rows immediately while sharing one background refresh", async () => {
    const previous = result("previous");
    await readAuditEvents("A", {}, () => Promise.resolve(previous));
    vi.advanceTimersByTime(AUDIT_CACHE_TTL_MS + 1);
    expect(peekAuditEvents("A", {})).toBeUndefined();
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBe(previous);
    let resolve!: (value: AuditEventsResult) => void;
    const load = vi.fn(
      () =>
        new Promise<AuditEventsResult>((done) => {
          resolve = done;
        }),
    );
    const pending = readAuditEvents("A", {}, load);
    expect(readAuditEvents("A", {}, load)).toBe(pending);
    await Promise.resolve();
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBe(previous);
    const next = result("next");
    resolve(next);
    await pending;
    expect(peekAuditEvents("A", {})).toBe(next);
    expect(load).toHaveBeenCalledOnce();
  });

  it("invalidates freshness without blanking rows or accepting an older in-flight write", async () => {
    const previous = result("previous");
    await readAuditEvents("A", {}, () => Promise.resolve(previous));
    invalidateAuditEventsCache();
    expect(peekAuditEvents("A", {})).toBeUndefined();
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBe(previous);
    let resolve!: (value: AuditEventsResult) => void;
    const old = readAuditEvents(
      "A",
      {},
      () =>
        new Promise<AuditEventsResult>((done) => {
          resolve = done;
        }),
    );
    await Promise.resolve();
    invalidateAuditEventsCache();
    const latest = result("latest");
    await readAuditEvents("A", {}, () => Promise.resolve(latest));
    resolve(result("outdated"));
    await old;
    expect(peekAuditEvents("A", {})).toBe(latest);
  });

  it("preserves retained rows after a refresh fails and allows a successful retry", async () => {
    const previous = result("previous");
    await readAuditEvents("A", {}, () => Promise.resolve(previous));
    invalidateAuditEventsCache();
    await expect(
      readAuditEvents("A", {}, () => Promise.reject(new Error("offline"))),
    ).rejects.toThrow("offline");
    expect(peekAuditEvents("A", {})).toBeUndefined();
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBe(previous);
    const latest = result("latest");
    await readAuditEvents("A", {}, () => Promise.resolve(latest));
    expect(peekAuditEvents("A", {})).toBe(latest);
  });

  it("bounds stale retention and clears stale data when the signed-in account changes", async () => {
    await readAuditEvents("A", {}, () => Promise.resolve(result()));
    vi.advanceTimersByTime(AUDIT_CACHE_RETENTION_MS);
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBeUndefined();
    await readAuditEvents("A", {}, () => Promise.resolve(result()));
    invalidateAuditEventsCache();
    expect(peekAuditEvents("B", {}, { allowStale: true })).toBeUndefined();
    clearCurrentUser();
    expect(peekAuditEvents("A", {}, { allowStale: true })).toBeUndefined();
  });

  it("shares concurrent reads and exposes warm results synchronously", async () => {
    const data = result();
    const load = vi.fn().mockResolvedValue(data);
    const first = readAuditEvents("A", {}, load);
    const second = readAuditEvents("A", { source: "all", page: 99 }, load);
    expect(first).toBe(second);
    expect(peekAuditEvents("A", {})).toBeUndefined();
    await first;
    expect(load).toHaveBeenCalledTimes(1);
    expect(peekAuditEvents("A", {})).toBe(data);
    await readAuditEvents("A", {}, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps source, search, date and account filter results separate", async () => {
    const load = vi.fn().mockResolvedValue(result());
    for (const filters of [
      {},
      { source: "system" as const },
      { q: "health" },
      { actor: "Admin" },
      { event: "health_check_run" },
      { from: "2026-10-01" },
      { to: "2026-10-26" },
      { account: "profile" },
    ]) {
      await readAuditEvents("A", filters, load);
    }
    expect(load).toHaveBeenCalledTimes(8);
  });

  it("expires data after the freshness window and starts freshness when the read completes", async () => {
    let resolve!: (value: AuditEventsResult) => void;
    const load = vi.fn(
      () =>
        new Promise<AuditEventsResult>((done) => {
          resolve = done;
        }),
    );
    const pending = readAuditEvents("A", {}, load);
    await Promise.resolve();
    vi.setSystemTime(Date.now() + AUDIT_CACHE_TTL_MS + 1);
    expect(readAuditEvents("A", {}, load)).toBe(pending);
    resolve(result());
    await pending;
    expect(peekAuditEvents("A", {})).toBeDefined();
    vi.setSystemTime(Date.now() + AUDIT_CACHE_TTL_MS);
    expect(peekAuditEvents("A", {})).toBeUndefined();
    const freshLoad = vi.fn().mockResolvedValue(result("new"));
    await readAuditEvents("A", {}, freshLoad);
    expect(freshLoad).toHaveBeenCalledOnce();
  });

  it("does not retain failed reads, so retry can succeed", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(result());
    await expect(readAuditEvents("A", {}, load)).rejects.toThrow("offline");
    await expect(readAuditEvents("A", {}, load)).resolves.toEqual(result());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("discards old in-flight cache writes after invalidation", async () => {
    let resolve!: (value: AuditEventsResult) => void;
    const old = readAuditEvents(
      "A",
      {},
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await Promise.resolve();
    clearAuditEventsCache();
    const latest = result("latest");
    await readAuditEvents("A", {}, () => Promise.resolve(latest));
    resolve(result("old"));
    await old;
    expect(peekAuditEvents("A", {})).toBe(latest);
  });

  it("isolates accounts and clears protected metadata with the session", async () => {
    await readAuditEvents("A", {}, () => Promise.resolve(result("A")));
    expect(peekAuditEvents("B", {})).toBeUndefined();
    await readAuditEvents("B", {}, () => Promise.resolve(result("B")));
    expect(peekAuditEvents("A", {})).toBeUndefined();
    clearCurrentUser();
    expect(peekAuditEvents("B", {})).toBeUndefined();
  });

  it("never shares a module cache between server requests", async () => {
    vi.stubGlobal("window", undefined);
    const load = vi.fn().mockResolvedValue(result());
    await readAuditEvents("A", {}, load);
    await readAuditEvents("A", {}, load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(peekAuditEvents("A", {})).toBeUndefined();
  });
});
