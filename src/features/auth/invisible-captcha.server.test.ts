import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://app.test/login") }));
vi.mock("~/server/rate-limit", () => ({ getClientIp: () => null, bucketKey: vi.fn() }));
vi.mock("~/utils/supabase", () => ({ getSupabaseAdminClient: vi.fn() }));
import { getInvisibleCaptchaPublicConfig, verifyInvisibleCaptcha } from "./captcha.server";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("RECAPTCHA_INVISIBLE_SITE_KEY", "invisible-public");
  vi.stubEnv("RECAPTCHA_INVISIBLE_SECRET_KEY", "invisible-private");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "checkbox-private");
  vi.stubEnv("RECAPTCHA_ALLOWED_HOSTNAMES", "app.test, preview.test, localhost");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, hostname: "app.test" })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("invisible CAPTCHA policy", () => {
  it("exposes only its public key and verifies using the separate secret", async () => {
    expect(getInvisibleCaptchaPublicConfig()).toEqual({ siteKey: "invisible-public", error: null });
    expect(await verifyInvisibleCaptcha("token")).toEqual({ error: false });
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.body as URLSearchParams).get("secret")).toBe("invisible-private");
    expect(init.method).toBe("POST");
  });
  it.each([undefined, "", " "])("rejects missing tokens before Google: %s", async token => {
    expect(await verifyInvisibleCaptcha(token)).toHaveProperty("error", true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { success: false }, { success: "true", hostname: "app.test" },
    { success: true, hostname: "localhost" }, { success: true, hostname: "attacker.test" },
    { success: true, hostname: "app.test", score: 0.9 },
    { success: true, hostname: "app.test", "error-codes": ["timeout-or-duplicate"] },
    null,
  ])("fails closed for %j", async body => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(body));
    expect(await verifyInvisibleCaptcha("token")).toHaveProperty("error", true);
  });
  it("accepts exact preview hosts and localhost only outside production", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "preview.test" }));
    expect(await verifyInvisibleCaptcha("token")).toEqual({ error: false });
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true, hostname: "localhost" }));
    expect(await verifyInvisibleCaptcha("token")).toEqual({ error: false });
  });
  it.each(["RECAPTCHA_INVISIBLE_SITE_KEY", "RECAPTCHA_INVISIBLE_SECRET_KEY", "RECAPTCHA_ALLOWED_HOSTNAMES"])("fails closed without %s", async key => {
    vi.stubEnv(key, "");
    expect(getInvisibleCaptchaPublicConfig().siteKey).toBeNull();
    expect(await verifyInvisibleCaptcha("token")).toHaveProperty("error", true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("logs missing configuration names without disclosing key values", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("RECAPTCHA_INVISIBLE_SITE_KEY", "");
    expect(getInvisibleCaptchaPublicConfig().siteKey).toBeNull();
    expect(log).toHaveBeenCalledWith("Invisible reCAPTCHA configuration:", "Missing RECAPTCHA_INVISIBLE_SITE_KEY");
    expect(JSON.stringify(log.mock.calls)).not.toContain("invisible-private");
    log.mockRestore();
  });
  it("aborts an unresponsive Google request after four seconds", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("Aborted")));
    }));
    const verification = verifyInvisibleCaptcha("token");
    await vi.advanceTimersByTimeAsync(4000);
    expect(await verification).toHaveProperty("error", true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
