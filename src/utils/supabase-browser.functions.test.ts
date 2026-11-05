import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ active: vi.fn(), header: vi.fn(), session: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ handler: (handler: unknown) => handler }) }));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: state.header }));
vi.mock("~/server/auth", () => ({ requireActiveSession: state.active }));
import { getSupabaseBrowserAccessToken } from "./supabase-browser.functions";
beforeEach(() => { vi.clearAllMocks(); state.active.mockResolvedValue({ supabase: { auth: { getSession: state.session } } }); });
describe("server token bridge", () => {
  it("returns only an access token after active-session validation and disables caching", async () => {
    state.session.mockResolvedValue({ data: { session: { access_token: "access-only", refresh_token: "never-expose" } }, error: null });
    expect(await getSupabaseBrowserAccessToken()).toBe("access-only");
    expect(state.active).toHaveBeenCalledOnce();
    expect(state.header).toHaveBeenCalledWith("Cache-Control", "private, no-store");
  });
  it("never exposes a token from a revoked, inactive or missing session", async () => {
    state.active.mockRejectedValueOnce(new Error("Session revoked"));
    expect(await getSupabaseBrowserAccessToken()).toBeNull();
    expect(state.session).not.toHaveBeenCalled();
  });
});
