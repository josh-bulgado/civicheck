import { afterEach, describe, expect, it, vi } from "vitest";
import { createHealthSampler } from "./system-health-live.server";

afterEach(() => vi.useRealTimers());

describe("health sampling", () => {
  it("shares concurrent checks, caches briefly, and only exposes timings", async () => {
    vi.useFakeTimers();
    const probe = vi.fn(async () => ({ error: null, data: { privateValue: "never serialize" } }));
    const sample = createHealthSampler({ database: probe, authentication: probe, storage: probe });
    const [first, concurrent] = await Promise.all([sample(), sample()]);
    expect(probe).toHaveBeenCalledTimes(3);
    expect(first).toEqual(concurrent);
    expect(first.services).toHaveLength(3);
    expect(first.services.every((service) => service.ok)).toBe(true);
    expect(JSON.stringify(first)).not.toContain("privateValue");
    await sample();
    expect(probe).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(5000);
    await sample();
    expect(probe).toHaveBeenCalledTimes(6);
  });

  it("reports failed and timed-out services without turning them into zero latency", async () => {
    vi.useFakeTimers();
    const sample = createHealthSampler({
      database: async () => ({ error: { message: "database details must stay private" } }),
      authentication: () => new Promise(() => {}),
      storage: async () => ({ error: null }),
    });
    const result = sample();
    await vi.advanceTimersByTimeAsync(4000);
    expect((await result).services).toEqual([
      { key: "database", ok: false, responseMs: null },
      { key: "authentication", ok: false, responseMs: null },
      { key: "storage", ok: true, responseMs: expect.any(Number) },
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("still takes a fresh reading on the next five-second tick when probes are slow", async () => {
    vi.useFakeTimers();
    const probe = vi.fn(() => new Promise<{ error: null }>((resolve) => setTimeout(() => resolve({ error: null }), 1000)));
    const sample = createHealthSampler({ database: probe, authentication: probe, storage: probe });
    const first = sample();
    await vi.advanceTimersByTimeAsync(1000);
    await first;
    await vi.advanceTimersByTimeAsync(4000);
    const second = sample();
    await vi.advanceTimersByTimeAsync(1000);
    await second;
    expect(probe).toHaveBeenCalledTimes(6);
  });
});
