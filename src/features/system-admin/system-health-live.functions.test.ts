import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), sample: vi.fn(), createSampler: vi.fn(), header: vi.fn(), admin: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ handler: (handler: unknown) => handler }) }));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: mocks.header }));
vi.mock("~/server/auth", () => ({ requireActiveSession: mocks.requireSession }));
vi.mock("~/utils/supabase", () => ({ getSupabaseAdminClient: mocks.admin }));
vi.mock("./system-health-live.server", () => ({ createHealthSampler: mocks.createSampler }));

import { getSystemHealthSample } from "./system-health-live.functions";

beforeEach(() => { vi.clearAllMocks(); mocks.createSampler.mockReturnValue(mocks.sample); });

describe("health sampling endpoint", () => {
  it("rejects unauthorized callers before any probes or cached data are accessed", async () => {
    mocks.requireSession.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(getSystemHealthSample()).rejects.toThrow("Forbidden");
    expect(mocks.requireSession).toHaveBeenCalledWith("health:view");
    expect(mocks.sample).not.toHaveBeenCalled();
    expect(mocks.createSampler).not.toHaveBeenCalled();
  });
  it("returns the authorized sample with caching disabled", async () => {
    const sample = { at: "2026-10-26T14:00:00.000Z", services: [{ key: "database", ok: true, responseMs: 23 }] };
    mocks.requireSession.mockResolvedValueOnce({});
    mocks.sample.mockResolvedValueOnce(sample);
    await expect(getSystemHealthSample()).resolves.toEqual(sample);
    expect(mocks.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("checks authorization again even after a sample has been cached", async () => {
    mocks.requireSession.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(getSystemHealthSample()).rejects.toThrow("Unauthorized");
    expect(mocks.sample).not.toHaveBeenCalled();
  });
  it("reuses the stateless probe client and sampler for later authorized requests", async () => {
    mocks.requireSession.mockResolvedValueOnce({});
    mocks.sample.mockResolvedValueOnce({ at: "2026-10-26T14:00:05.000Z", services: [] });
    await getSystemHealthSample();
    expect(mocks.requireSession).toHaveBeenCalledWith("health:view");
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.createSampler).not.toHaveBeenCalled();
    expect(mocks.sample).toHaveBeenCalledOnce();
  });
});
