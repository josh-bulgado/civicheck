import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieOptions } from "@supabase/ssr";

const state = vi.hoisted(() => ({
  url: "https://civicheck.test/signup",
  cookies: new Map<string, { value: string; options: CookieOptions }>(),
  consumed: new Set<string>(),
  rpcUnavailable: false,
  rpc: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request(state.url),
  getRequestIP: () => "192.0.2.10",
  getCookie: (name: string) => state.cookies.get(name)?.value,
  setCookie: (name: string, value: string, options: CookieOptions) => state.cookies.set(name, { value, options }),
  deleteCookie: (name: string) => state.cookies.delete(name),
}));
vi.mock("~/utils/supabase", () => ({ getSupabaseAdminClient: () => ({ rpc: state.rpc }) }));
import { consumeOAuthCaptchaProof, getCaptchaPublicConfig, issueOAuthCaptchaProof, verifyCaptcha } from "./captcha.server";

beforeEach(() => {
  state.url = "https://civicheck.test/signup";
  state.cookies.clear();
  state.consumed.clear();
  state.rpcUnavailable = false;
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "https://civicheck.test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only-signing-key");
  vi.stubEnv("TURNSTILE_SITE_KEY", "production-site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "production-secret-key");
  vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    success: true, hostname: "civicheck.test", action: "authentication",
  })));
  state.rpc.mockImplementation(async (_name, args) => {
    if (state.rpcUnavailable) return { data: null, error: { message: "Unavailable" } };
    if (state.consumed.has(args.p_bucket)) return { data: false, error: null };
    state.consumed.add(args.p_bucket);
    return { data: true, error: null };
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Turnstile server validation", () => {
  it("returns only the site key to the browser", () => {
    expect(getCaptchaPublicConfig()).toEqual({ siteKey: "production-site-key", error: null });
    expect(JSON.stringify(getCaptchaPublicConfig())).not.toContain("production-secret-key");
  });
  it("verifies against Cloudflare with the server secret and expected metadata", async () => {
    expect(await verifyCaptcha("valid-token")).toEqual({ error: false });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init!.body as URLSearchParams;
    expect(body.get("secret")).toBe("production-secret-key");
    expect(body.get("response")).toBe("valid-token");
  });
  it.each([undefined, "", " ", "x".repeat(2049)])("rejects a missing or malformed token without contacting Cloudflare", async token => {
    expect(await verifyCaptcha(token)).toMatchObject({ error: true, captchaError: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: true, hostname: "other.test", action: "authentication" },
    { success: true, hostname: "civicheck.test", action: "wrong-action" },
    { success: true },
    { success: "true", hostname: "civicheck.test", action: "authentication" },
  ])("rejects expired, replayed or mismatched validation: %j", async response => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(response));
    expect(await verifyCaptcha("bad-token")).toMatchObject({ error: true, captchaError: true });
  });
  it("supports explicit preview hostnames without trusting a request's Host header", async () => {
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "civicheck.test, civicheck-preview.test");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "civicheck-preview.test", action: "authentication" }));
    expect(await verifyCaptcha("valid-preview")).toEqual({ error: false });
  });
  it.each(["timeout", "http", "json"])("fails closed on a validation service failure (%s)", async failure => {
    if (failure === "timeout") vi.mocked(fetch).mockRejectedValueOnce(new Error("Timeout"));
    else if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    else vi.mocked(fetch).mockResolvedValueOnce(new Response("invalid json"));
    expect(await verifyCaptcha("some-token")).toMatchObject({ error: true, captchaError: true });
  });
  it("fails closed in production without keys", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(getCaptchaPublicConfig().siteKey).toBeNull();
    expect(await verifyCaptcha("some-token")).toMatchObject({ error: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses official dummy keys only for local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    state.url = "http://localhost:3000/signup";
    expect(getCaptchaPublicConfig().siteKey).toBe("1x00000000000000000000AA");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "example.com", action: "test" }));
    expect(await verifyCaptcha("test-token")).toEqual({ error: false });
    state.url = "https://public-preview.test/signup";
    expect(getCaptchaPublicConfig().siteKey).toBeNull();
  });
  it("rejects explicitly configured dummy keys in production", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(await verifyCaptcha("test-token")).toMatchObject({ error: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("OAuth CAPTCHA proof", () => {
  it("issues an HttpOnly cookie and consumes it exactly once, including a copied-cookie replay", async () => {
    issueOAuthCaptchaProof();
    const proof = state.cookies.get("civicheck-oauth-captcha")!;
    expect(proof.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
    expect(await consumeOAuthCaptchaProof()).toBe(true);
    expect(state.cookies.has("civicheck-oauth-captcha")).toBe(false);
    state.cookies.set("civicheck-oauth-captcha", proof);
    expect(await consumeOAuthCaptchaProof()).toBe(false);
  });
  it("rejects an absent proof", async () => {
    expect(await consumeOAuthCaptchaProof()).toBe(false);
  });
  it("rejects a tampered proof", async () => {
    issueOAuthCaptchaProof();
    const proof = state.cookies.get("civicheck-oauth-captcha")!;
    state.cookies.set("civicheck-oauth-captcha", { ...proof, value: `${proof.value}00` });
    expect(await consumeOAuthCaptchaProof()).toBe(false);
  });
  it("rejects an expired proof", async () => {
    issueOAuthCaptchaProof();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 601000);
    expect(await consumeOAuthCaptchaProof()).toBe(false);
  });
  it("fails closed when the proof consumption counter is unavailable", async () => {
    issueOAuthCaptchaProof();
    state.rpcUnavailable = true;
    expect(await consumeOAuthCaptchaProof()).toBe(false);
  });
});
