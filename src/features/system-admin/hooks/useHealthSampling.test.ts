import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthLiveSample } from "../system-admin.types";
import { buildDashboard } from "../system-health.model";
import { useHealthSampling } from "./useHealthSampling";

// Run the hook's effect with controlled timers and requests, without a DOM renderer.
const mocks = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
  setters: [] as ReturnType<typeof vi.fn>[],
  getSample: vi.fn(),
  onResolved: undefined as (() => void) | undefined,
  router: {
    state: { location: { pathname: "/system-admin/health" } },
    subscribe: vi.fn((_event: string, listener: () => void) => { mocks.onResolved = listener; return vi.fn(); }),
  },
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => { mocks.effect = effect; },
  useMemo: (compute: () => unknown) => compute(),
  useState: (initial: unknown) => {
    const setter = vi.fn();
    mocks.setters.push(setter);
    return [initial, setter];
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.getSample }));
vi.mock("@tanstack/react-router", () => ({ useRouter: () => mocks.router }));
vi.mock("../system-health-live.functions", () => ({ getSystemHealthSample: vi.fn() }));

const data = buildDashboard({
  summary: {
    now: "2026-10-27T10:00:00.000Z", checked_at: null, last_manual_at: null, monitor: null, events: [], settings: null,
    components: ["capacity", "monitor"].map((key) => ({
      key, name: key, description: "", kind: "platform", measured_by: "Monitor", update_cadence: "Every 15 minutes", exposure: "Metadata only",
      slow_after_ms: null, capacity_bytes: null, sort_order: 1, last_at: null, last_outcome: null, last_status: null, last_ms: null,
      object_count: null, total_bytes: null, availability: null, ok_n: 0, slow_n: 0, failed_n: 0,
    })),
  },
  series: [], security: null, canManage: true,
});
const sample: HealthLiveSample = { at: "2026-10-27T10:00:05.000Z", services: [] };
let cleanup: (() => void) | void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.setters = [];
  mocks.onResolved = undefined;
  mocks.router.state.location.pathname = "/system-admin/health";
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function SamplingHarness() {
  useHealthSampling(data, true);
  cleanup = mocks.effect?.();
}

describe("health readings during navigation", () => {
  it("keeps updating every five seconds while System Health is displayed", async () => {
    mocks.getSample.mockResolvedValue(sample);
    SamplingHarness();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.getSample).toHaveBeenCalledTimes(2);
    expect(mocks.setters[0]).toHaveBeenCalledTimes(2);
  });

  it.each(["success", "failure"])("ignores a late %s after navigation to Security Center starts", async (outcome) => {
    let resolve!: (value: HealthLiveSample) => void;
    let reject!: (error: Error) => void;
    const request = new Promise<HealthLiveSample>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
    mocks.getSample.mockReturnValue(request);
    SamplingHarness();
    // The health page is still mounted while the security loader is pending.
    mocks.router.state.location.pathname = "/system-admin/security";
    if (outcome === "success") resolve(sample);
    else reject(new Error("Connection interrupted"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.setters[0]).not.toHaveBeenCalled();
    expect(mocks.setters[1]).not.toHaveBeenCalled();
    expect(mocks.getSample).toHaveBeenCalledTimes(1);
  });

  it("does not start the next five-second request after leaving the page", async () => {
    mocks.getSample.mockResolvedValue(sample);
    SamplingHarness();
    await vi.advanceTimersByTimeAsync(0);
    mocks.router.state.location.pathname = "/system-admin/security";
    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.getSample).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight request when the page unmounts", () => {
    mocks.getSample.mockReturnValue(new Promise(() => {}));
    SamplingHarness();
    const { signal } = mocks.getSample.mock.calls[0][0];
    cleanup?.();
    cleanup = undefined;
    expect(signal.aborted).toBe(true);
  });

  it("resumes readings if back navigation cancels the departure before unmount", async () => {
    mocks.getSample.mockResolvedValue(sample);
    SamplingHarness();
    await vi.advanceTimersByTimeAsync(0);
    mocks.router.state.location.pathname = "/system-admin/security";
    await vi.advanceTimersByTimeAsync(5000);
    mocks.router.state.location.pathname = "/system-admin/health";
    mocks.onResolved?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.getSample).toHaveBeenCalledTimes(2);
  });
});
