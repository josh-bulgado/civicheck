import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

const mocks = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
  invalidate: vi.fn(),
  state: { isLoading: false, status: "idle" },
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => { mocks.effect = effect; },
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ state: mocks.state, invalidate: mocks.invalidate }),
}));
vi.mock("~/utils/supabase-browser", () => ({
  // Focus/visibility fallbacks work independently of the channel connecting.
  getSupabaseBrowserClient: () => new Promise(() => {}),
}));

let cleanup: (() => void) | void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.state.isLoading = false;
  mocks.state.status = "idle";
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function RefreshHarness() {
  useRealtimeRefresh({ tables: ["system_health_snapshots"] });
  cleanup = mocks.effect?.();
}

describe("background refresh during route changes", () => {
  it("defers invalidation until loading and the navigation transition finish", async () => {
    RefreshHarness();
    mocks.state.isLoading = true;
    mocks.state.status = "pending";
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.invalidate).not.toHaveBeenCalled();
    mocks.state.isLoading = false;
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.invalidate).not.toHaveBeenCalled();
    mocks.state.status = "idle";
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
  });

  it("cancels the old page's queued refresh when it unmounts", async () => {
    RefreshHarness();
    mocks.state.isLoading = true;
    window.dispatchEvent(new Event("focus"));
    cleanup?.();
    cleanup = undefined;
    mocks.state.isLoading = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it("still refreshes immediately when navigation is idle", () => {
    RefreshHarness();
    window.dispatchEvent(new Event("focus"));
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
  });
});
