import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ create: vi.fn(), token: vi.fn(), config: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: state.create }));
vi.mock("./supabase-browser.functions", () => ({ getSupabaseBrowserAccessToken: state.token, getSupabaseBrowserConfig: state.config }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  state.create.mockReturnValue({ storage: {}, realtime: {} });
  state.config.mockResolvedValue({ url: "https://test.supabase.co", publishableKey: "public-test-key" });
});
describe("browser services with HttpOnly credentials", () => {
  it("uses a fresh server token callback with no browser cookie or refresh-token storage", async () => {
    const { getSupabaseBrowserClient } = await import("./supabase-browser");
    await getSupabaseBrowserClient();
    const options = state.create.mock.calls[0][2];
    expect(options).not.toHaveProperty("cookies");
    expect(options.auth).toEqual({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
    state.token.mockResolvedValueOnce("first-access-token").mockResolvedValueOnce("refreshed-access-token").mockResolvedValueOnce(null);
    expect(await options.accessToken()).toBe("first-access-token");
    expect(await options.accessToken()).toBe("refreshed-access-token");
    expect(await options.accessToken()).toBeNull();
  });
  it("reuses the connection without caching an account's token", async () => {
    const { getSupabaseBrowserClient } = await import("./supabase-browser");
    expect(await getSupabaseBrowserClient()).toBe(await getSupabaseBrowserClient());
    expect(state.create).toHaveBeenCalledOnce();
    expect(state.token).not.toHaveBeenCalled();
  });
});
