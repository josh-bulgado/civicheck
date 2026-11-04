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
vi.mock("~/utils/supabase", () => ({ getSupabaseAdminClient: () => ({ rpc: state.rpc }), secureCookiesEnabled: () => true }));
import { consumeOAuthCaptchaProof, getCaptchaPublicConfig, issueOAuthCaptchaProof, verifyCaptcha } from "./captcha.server";
import { CAPTCHA_TOKEN_MAX_LENGTH, CAPTCHA_UNAVAILABLE_MESSAGE } from "./captcha";

beforeEach(() => {
  state.url = "https://civicheck.test/signup";
  state.cookies.clear();
  state.consumed.clear();
  state.rpcUnavailable = false;
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("APP_URL", "https://civicheck.test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only-signing-key");
  vi.stubEnv("RECAPTCHA_SITE_KEY", "production-site-key");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "production-secret-key");
  vi.stubEnv("RECAPTCHA_ALLOWED_HOSTNAMES", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    success: true, hostname: "civicheck.test",
  })));
  state.rpc.mockImplementation(async (_name, args) => {
    if (state.rpcUnavailable) return { data: null, error: { message: "Unavailable" } };
    if (state.consumed.has(args.p_bucket)) return { data: false, error: null };
    state.consumed.add(args.p_bucket);
    return { data: true, error: null };
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("reCAPTCHA v2 server validation", () => {
  it("returns only the site key to the browser", () => {
    expect(getCaptchaPublicConfig()).toEqual({ siteKey: "production-site-key", error: null });
    expect(JSON.stringify(getCaptchaPublicConfig())).not.toContain("production-secret-key");
  });
  it("verifies a v2 response without v3 action metadata using Google's server endpoint", async () => {
    expect(await verifyCaptcha("valid-token")).toEqual({ error: false });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://www.google.com/recaptcha/api/siteverify");
    const body = init!.body as URLSearchParams;
    expect(body.get("secret")).toBe("production-secret-key");
    expect(body.get("response")).toBe("valid-token");
    expect(body.get("remoteip")).toBe("192.0.2.10");
  });
  it("accepts bounded long reCAPTCHA tokens without truncation", async () => {
    const token = "x".repeat(CAPTCHA_TOKEN_MAX_LENGTH);
    expect(await verifyCaptcha(token)).toEqual({ error: false });
    expect((vi.mocked(fetch).mock.calls[0][1]!.body as URLSearchParams).get("response")).toBe(token);
  });
  it.each([undefined, "", " ", "x".repeat(CAPTCHA_TOKEN_MAX_LENGTH + 1)])("rejects a missing or malformed token without contacting Google", async token => {
    expect(await verifyCaptcha(token)).toMatchObject({ error: true, captchaError: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: true, hostname: "other.test" },
    { success: true, hostname: "civicheck.test", score: 0.9 },
    { success: true, hostname: 123 },
    { success: true, hostname: "civicheck.test", "error-codes": ["Over free quota."] },
    { success: true, hostname: "civicheck.test", "error-codes": "malformed" },
    { success: true },
    { success: "true", hostname: "civicheck.test" },
  ])("rejects expired, replayed or mismatched validation: %j", async response => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(response));
    expect(await verifyCaptcha("bad-token")).toMatchObject({ error: true, captchaError: true });
  });
  it("supports explicit preview hostnames without trusting a request's Host header", async () => {
    vi.stubEnv("RECAPTCHA_ALLOWED_HOSTNAMES", "civicheck.test, civicheck-preview.test");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "civicheck-preview.test", "error-codes": [] }));
    expect(await verifyCaptcha("valid-preview")).toEqual({ error: false });
  });
  it.each(["timeout", "http", "json"])("fails closed on a validation service failure (%s)", async failure => {
    if (failure === "timeout") vi.mocked(fetch).mockRejectedValueOnce(new Error("Timeout"));
    else if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    else vi.mocked(fetch).mockResolvedValueOnce(new Response("invalid json"));
    expect(await verifyCaptcha("some-token")).toMatchObject({ error: true, captchaError: true });
  });
  it.each(["RECAPTCHA_SITE_KEY", "RECAPTCHA_SECRET_KEY"])("fails closed in production without %s", async key => {
    vi.stubEnv(key, "");
    expect(getCaptchaPublicConfig().siteKey).toBeNull();
    expect(await verifyCaptcha("some-token")).toMatchObject({ error: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses official dummy keys only for local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("RECAPTCHA_SITE_KEY", "");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    state.url = "http://localhost:3000/signup";
    expect(getCaptchaPublicConfig().siteKey).toBe("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "testkey.google.com" }));
    expect(await verifyCaptcha("test-token")).toEqual({ error: false });
    state.url = "https://public-preview.test/signup";
    expect(getCaptchaPublicConfig().siteKey).toBeNull();
  });
  it("rejects explicitly configured dummy keys in production", async () => {
    vi.stubEnv("RECAPTCHA_SITE_KEY", "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe");
    expect(await verifyCaptcha("test-token")).toMatchObject({ error: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["RECAPTCHA_SITE_KEY", "RECAPTCHA_SECRET_KEY"])("rejects a test/production key mix (%s), even on localhost", async key => {
    vi.stubEnv("NODE_ENV", "development");
    state.url = "http://localhost:3000/signup";
    vi.stubEnv(key, key === "RECAPTCHA_SITE_KEY"
      ? "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
      : "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe");
    expect(getCaptchaPublicConfig().siteKey).toBeNull();
    expect(await verifyCaptcha("test-token")).toMatchObject({ error: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports unavailable when Google returns success alongside a quota error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({
      success: true, hostname: "civicheck.test", "error-codes": ["Over free quota."],
    }));
    expect(await verifyCaptcha("token")).toMatchObject({ error: true, message: CAPTCHA_UNAVAILABLE_MESSAGE });
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
