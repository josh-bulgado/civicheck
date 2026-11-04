import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  signIn: vi.fn(),
  createUser: vi.fn(),
  ip: "192.0.2.10" as string | undefined,
  counterUnavailable: false,
  sendEmail: vi.fn(),
  oauth: vi.fn(),
  exchangeCode: vi.fn(),
  signOut: vi.fn(),
  commitCookies: vi.fn(),
  recordSession: vi.fn(),
  requestUrl: "https://civicheck.test/auth/callback?code=test-code",
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (handler: unknown) => handler }),
    handler: (handler: unknown) => handler,
  }),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => state.ip,
  getRequest: () => new Request(state.requestUrl),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  redirect: vi.fn(),
}));
vi.mock("~/utils/supabase", () => ({
  getSupabaseAdminClient: () => ({
    rpc: state.rpc,
    from: state.from,
    auth: { admin: {
      createUser: state.createUser,
      generateLink: async () => ({ data: { properties: { email_otp: "123456" } }, error: null }),
    } },
  }),
  getSupabaseServerClient: () => ({
    auth: {
      signInWithPassword: state.signIn, signInWithOAuth: state.oauth,
      exchangeCodeForSession: state.exchangeCode, signOut: state.signOut,
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
      data: { role: "applicant", access_status: "active" }, error: null,
    }) }) }) }),
  }),
  getSupabaseStatelessClient: () => ({ auth: { signInWithPassword: state.signIn } }),
  setSessionScope: vi.fn(), clearSessionScope: vi.fn(),
  commitSupabaseCookies: state.commitCookies,
}));
vi.mock("~/utils/resend", () => ({ sendEmail: state.sendEmail }));
vi.mock("~/utils/app-url", () => ({ getAppUrl: () => "https://civicheck.test" }));
vi.mock("~/utils/email-template", () => ({
  renderOtpEmail: vi.fn(), renderVerificationEmail: vi.fn(), renderVerificationEmailText: vi.fn(),
}));
vi.mock("~/server/auth", () => ({ requireActiveSession: vi.fn() }));
vi.mock("~/server/auth-users", () => ({ findAuthUserByEmail: async () => null }));
vi.mock("~/features/system-admin/security-center.server", () => ({
  recordAuthenticationSecurityEvent: vi.fn(), recordSessionForCurrentUser: state.recordSession, recordSessionStarted: vi.fn(),
}));
vi.mock("./otp-codes.server", () => ({
  clearIssuedOtps: vi.fn(), describeRejectedOtp: vi.fn(), recordIssuedOtp: vi.fn(),
}));

import { loginWithEmailFn, loginWithOAuthFn, resendSignupOtpFn, signupFn } from "./auth.mutations";
import { bucketKey } from "~/server/rate-limit";
import { handleCallback } from "~/routes/auth/callback";

const db = new PGlite();
const credentials = { email: "lockout@example.test", password: "WrongPassword1!" };
const signup = {
  ...credentials, firstName: "Test", lastName: "Applicant",
  middleName: "", hasNoMiddleName: true, suffix: "",
};

beforeAll(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261027121000_add_rate_limits.sql", import.meta.url), "utf8"));
  // Exercise the real atomic counter through the same RPC/query shapes used by
  // the handlers; Auth/email are mocked so no real accounts or mail are created.
  state.rpc.mockImplementation(async (_name, args) => {
    if (state.counterUnavailable) return { data: null, error: { message: "Unavailable" } };
    const result = await db.query<{ allowed: boolean }>(
      "select public.consume_rate_limit($1, $2, $3) as allowed",
      [args.p_bucket, args.p_limit, args.p_window_seconds],
    );
    return { data: result.rows[0].allowed, error: null };
  });
  state.from.mockImplementation((table) => {
    if (table === "profiles") return { update: () => ({ eq: async () => ({ error: null }) }) };
    if (table !== "rate_limit_hits") throw new Error(`Unexpected table: ${table}`);
    let bucket = "";
    let after = "1970-01-01T00:00:00.000Z";
    let deleting = false;
    const query = {
      select: () => query,
      eq: (_column: string, value: string) => { bucket = value; return query; },
      gt: (_column: string, value: string) => { after = value; return query; },
      order: () => query,
      limit: () => query,
      delete: () => { deleting = true; return query; },
      then: async (resolve: (value: unknown) => unknown) => {
        if (state.counterUnavailable) return resolve({ data: null, count: null, error: { message: "Unavailable" } });
        if (deleting) {
          await db.query("delete from public.rate_limit_hits where bucket = $1", [bucket]);
          return resolve({ error: null });
        }
        const result = await db.query<{ hit_at: string }>(
          "select hit_at from public.rate_limit_hits where bucket = $1 and hit_at > $2 order by hit_at", [bucket, after],
        );
        return resolve({ data: result.rows.slice(0, 1), count: result.rows.length, error: null });
      },
    };
    return query;
  });
});

beforeEach(async () => {
  await db.exec("truncate public.rate_limit_hits");
  vi.clearAllMocks();
  state.ip = "192.0.2.10";
  state.counterUnavailable = false;
  state.requestUrl = "https://civicheck.test/auth/callback?code=test-code";
  state.signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  state.createUser.mockResolvedValue({ error: { code: "email_exists", message: "Email already registered" } });
  state.oauth.mockResolvedValue({ data: { url: "https://accounts.google.com/test" }, error: null });
  state.exchangeCode.mockResolvedValue({ data: { user: { id: "applicant", email: credentials.email } }, error: null });
  state.signOut.mockResolvedValue({ error: null });
});

describe("OAuth respects the account cooldown", () => {
  it.each(["sign-in", "sign-up"])("rejects Google before redirect when the email has a %s cooldown", async action => {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (action === "sign-in") await loginWithEmailFn({ data: credentials });
      else await signupFn({ data: signup });
    }
    const result = await loginWithOAuthFn({ data: { provider: "google", email: credentials.email } });
    expect(result).toMatchObject({ error: true, lockedUntil: expect.any(Number) });
    expect(state.oauth).not.toHaveBeenCalled();
  });

  it.each(["sign-in", "sign-up"])("rejects the verified Google email after a %s cooldown even if the form email is omitted", async action => {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (action === "sign-in") await loginWithEmailFn({ data: credentials });
      else await signupFn({ data: signup });
    }
    state.ip = "192.0.2.30";
    await loginWithOAuthFn({ data: { provider: "google" } });
    const result = await handleCallback();
    expect(result).toMatchObject({ error: true, lockedUntil: expect.any(Number) });
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(state.commitCookies).not.toHaveBeenCalled();
    expect(state.recordSession).not.toHaveBeenCalled();
  });

  it("checks Google's verified email when the form supplies a different unlocked email", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    await loginWithOAuthFn({ data: { provider: "google", email: "unlocked@example.test" } });
    const result = await handleCallback();
    expect(result.error).toBe(true);
    expect(state.commitCookies).not.toHaveBeenCalled();
  });

  it.each(["error", "throw"])("never publishes cookies when revoking the blocked session fails (%s)", async failure => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    if (failure === "error") state.signOut.mockResolvedValueOnce({ error: { message: "Unavailable" } });
    else state.signOut.mockRejectedValueOnce(new Error("Unavailable"));
    expect(await handleCallback()).toMatchObject({ error: true, lockedUntil: expect.any(Number) });
    expect(state.commitCookies).not.toHaveBeenCalled();
    expect(state.recordSession).not.toHaveBeenCalled();
  });

  it("allows Google after cooldown expiry without spending another password attempt", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    await db.exec("update public.rate_limit_hits set hit_at = now() - interval '16 minutes'");
    const rpcCalls = state.rpc.mock.calls.length;
    const start = await loginWithOAuthFn({ data: { provider: "google", email: credentials.email } });
    expect(start).toHaveProperty("url");
    expect(await handleCallback()).toMatchObject({ error: false });
    expect(state.commitCookies).toHaveBeenCalledOnce();
    expect(state.recordSession).toHaveBeenCalledOnce();
    expect(state.rpc).toHaveBeenCalledTimes(rpcCalls);
  });

  it("allows Google for an account below five attempts", async () => {
    for (let attempt = 0; attempt < 4; attempt++) await loginWithEmailFn({ data: credentials });
    expect(await handleCallback()).toMatchObject({ error: false });
    expect(state.commitCookies).toHaveBeenCalledOnce();
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("fails closed if the callback cannot read the lockout counter", async () => {
    state.counterUnavailable = true;
    expect(await handleCallback()).toMatchObject({ error: true, message: expect.stringContaining("try again shortly") });
    expect(state.commitCookies).not.toHaveBeenCalled();
    expect(state.recordSession).not.toHaveBeenCalled();
  });

  it("rejects a Google response without a verified email", async () => {
    state.exchangeCode.mockResolvedValueOnce({ data: { user: { id: "applicant" } }, error: null });
    expect(await handleCallback()).toMatchObject({ error: true });
    expect(state.commitCookies).not.toHaveBeenCalled();
    expect(state.recordSession).not.toHaveBeenCalled();
  });
});
afterAll(async () => { await db.close(); });

describe("five-attempt authentication lockout", () => {
  it("allows five login checks, reports the lockout on the fifth failure, then rejects direct calls", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await loginWithEmailFn({ data: credentials });
      expect(result.error).toBe(true);
      expect("attemptsRemaining" in result && result.attemptsRemaining).toBe(5 - attempt);
      expect("lockedUntil" in result && !!result.lockedUntil).toBe(attempt === 5);
    }
    const result = await loginWithEmailFn({ data: credentials });
    expect(result).toMatchObject({ error: true, attemptsRemaining: 0, lockedUntil: expect.any(Number) });
    expect(state.signIn).toHaveBeenCalledTimes(5);
  });

  it("shares the account counter across casing, IP changes, and new requests", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    state.ip = "192.0.2.20";
    const result = await loginWithEmailFn({ data: { ...credentials, email: credentials.email.toUpperCase() } });
    expect(result).toMatchObject({ error: true, lockedUntil: expect.any(Number) });
    expect(state.signIn).toHaveBeenCalledTimes(5);
  });

  it("does not let simultaneous requests exceed five password checks", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => loginWithEmailFn({ data: credentials })));
    expect(results.every(result => result.error)).toBe(true);
    expect(state.signIn).toHaveBeenCalledTimes(5);
  });

  it("permits retry once the persisted cooldown expires", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    await db.exec("update public.rate_limit_hits set hit_at = now() - interval '16 minutes'");
    const result = await loginWithEmailFn({ data: credentials });
    expect(result).toMatchObject({ error: true, attemptsRemaining: 4, lockedUntil: undefined });
    expect(state.signIn).toHaveBeenCalledTimes(6);
  });

  it.each([false, true])("resets after correct credentials, including an unconfirmed account (%s)", async (unconfirmed) => {
    for (let attempt = 0; attempt < 4; attempt++) await loginWithEmailFn({ data: credentials });
    state.signIn.mockResolvedValueOnce(unconfirmed
      ? { error: { message: "Email not confirmed" } }
      : { data: { user: { id: "applicant" } }, error: null });
    const result = await loginWithEmailFn({ data: credentials });
    expect(result).not.toHaveProperty("lockedUntil");
    const nextFailure = await loginWithEmailFn({ data: credentials });
    expect(nextFailure).toMatchObject({ error: true, attemptsRemaining: 4 });
  });

  it("allows five failed signups without spending the email-send quota, then blocks creation", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await signupFn({ data: signup });
      expect(result).toMatchObject({ error: true, attemptsRemaining: 5 - attempt });
      if (attempt === 5) expect(result).toHaveProperty("lockedUntil", expect.any(Number));
    }
    await signupFn({ data: signup });
    expect(state.createUser).toHaveBeenCalledTimes(5);
    expect(state.sendEmail).not.toHaveBeenCalled();
    expect(state.rpc.mock.calls.some(([, args]) => args.p_bucket.startsWith("otp-send:"))).toBe(false);
  });

  it("clears the signup counter after an account and verification email are created", async () => {
    await signupFn({ data: signup });
    state.createUser.mockResolvedValueOnce({ data: { user: { id: "new-applicant" } }, error: null });
    const result = await signupFn({ data: signup });
    expect(result.error).toBe(false);
    expect(state.sendEmail).toHaveBeenCalledTimes(1);
    const count = await db.query<{ count: number }>(
      "select count(*)::int as count from public.rate_limit_hits where bucket = $1",
      [bucketKey("sign-up:email", credentials.email)],
    );
    expect(count.rows[0].count).toBe(0);
  });

  it("keeps other email accounts independent and still limits a missing IP", async () => {
    state.ip = undefined;
    for (let attempt = 0; attempt < 6; attempt++) await loginWithEmailFn({ data: credentials });
    expect(state.signIn).toHaveBeenCalledTimes(5);
    await loginWithEmailFn({ data: { ...credentials, email: "other@example.test" } });
    expect(state.signIn).toHaveBeenCalledTimes(6);
  });

  it("cannot bypass a login lockout through the resend-verification password check", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    const result = await resendSignupOtpFn({ data: credentials });
    expect(result.error).toBe(true);
    expect(state.signIn).toHaveBeenCalledTimes(5);
    expect(state.createUser).not.toHaveBeenCalled();
  });

  it.each(["sign-in", "sign-up"])("fails closed when the %s counter is unavailable", async (action) => {
    state.counterUnavailable = true;
    const result = action === "sign-in"
      ? await loginWithEmailFn({ data: credentials })
      : await signupFn({ data: signup });
    expect(result).toMatchObject({ error: true, message: expect.stringContaining("try again shortly") });
    expect(state.signIn).not.toHaveBeenCalled();
    expect(state.createUser).not.toHaveBeenCalled();
  });
});
