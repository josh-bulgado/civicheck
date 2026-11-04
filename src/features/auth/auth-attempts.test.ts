import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  dummyCompare: vi.fn(),
  needsDummy: false,
  background: [] as Promise<unknown>[],
  generateLink: vi.fn(),
  oauthIntent: "login" as "login" | "signup",
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
  captchaProofAllowed: true,
  requestUrl: "https://civicheck.test/auth/callback?code=test-code",
}));

vi.mock("bcryptjs", () => ({ compare: state.dummyCompare }));
vi.mock("@vercel/functions", () => ({ waitUntil: (work: Promise<unknown>) => state.background.push(work) }));
vi.mock("~/server/client-ip", () => ({ getClientIp: () => state.ip }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (handler: unknown) => handler }),
    handler: (handler: unknown) => handler,
  }),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestIP: () => state.ip,
  getRequest: () => new Request(state.requestUrl),
  setResponseHeader: vi.fn(),
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
      generateLink: state.generateLink,
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
  recordAuthenticationSecurityEvent: async () => {}, recordSessionForCurrentUser: state.recordSession, recordSessionStarted: vi.fn(),
}));
vi.mock("./otp-codes.server", () => ({
  clearIssuedOtps: vi.fn(), describeRejectedOtp: vi.fn(), recordIssuedOtp: vi.fn(),
}));
vi.mock("./captcha.server", () => ({
  verifyCaptcha: async (token: string | undefined) => token === "valid-captcha"
    ? { error: false }
    : { error: true, captchaError: true, captchaRequired: true, message: "Please complete the security verification to continue." },
  verifyInvisibleCaptcha: async (token: string | undefined) => token === "valid-captcha"
    ? { error: false }
    : { error: true, captchaError: true, message: "Verification required" },
  issueOAuthCaptchaProof: vi.fn(),
  consumeOAuthFlowProof: async () => state.captchaProofAllowed && state.oauthIntent,
  consumeOAuthCaptchaProof: async () => state.captchaProofAllowed,
}));

import { loginWithEmailFn, loginWithOAuthFn, resendSignupOtpFn, signupFn, forgotPasswordFn } from "./auth.mutations";
import { bucketKey } from "~/server/rate-limit";
import { handleCallback } from "~/routes/auth/callback";

const db = new PGlite();
const credentials = { email: "lockout@example.test", password: "WrongPassword1!", "g-recaptcha-response": "valid-captcha" };
const signup = {
  ...credentials, captchaToken: "valid-captcha", firstName: "Test", lastName: "Applicant",
  middleName: "", hasNoMiddleName: true, suffix: "",
};

beforeAll(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261027121000_add_rate_limits.sql", import.meta.url), "utf8"));
  await db.exec("create schema auth; create table auth.users(id uuid, email text, encrypted_password text, email_confirmed_at timestamptz, created_at timestamptz);");
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261104151609_harden_login_and_recovery.sql", import.meta.url), "utf8"));
  // Exercise the real atomic counter through the same RPC/query shapes used by
  // the handlers; Auth/email are mocked so no real accounts or mail are created.
  state.rpc.mockImplementation(async (_name, args) => {
    if (state.counterUnavailable) return { data: null, error: { message: "Unavailable" } };
    if (_name === "login_account_security_info") return { data: { email: credentials.email, needsDummyPassword: state.needsDummy, bcryptCost: 10 }, error: null };
    if (_name === "reserve_login_attempt") {
      const result = await db.query<{ value: unknown }>("select public.reserve_login_attempt($1, $2, $3) as value", [args.p_pair, args.p_ip, args.p_account]);
      return { data: result.rows[0].value, error: null };
    }
    if (_name === "finish_login_attempt") {
      const result = await db.query<{ value: unknown }>("select public.finish_login_attempt($1, $2) as value", [args.p_attempt, args.p_success]);
      return { data: result.rows[0].value, error: null };
    }
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

afterEach(async () => { await Promise.all(state.background); vi.unstubAllEnvs(); });
afterAll(() => db.close());

beforeEach(async () => {
  await db.exec("truncate public.rate_limit_hits");
  vi.clearAllMocks();
  vi.stubEnv("VERCEL", "1");
  state.needsDummy = false;
  state.background = [];
  state.oauthIntent = "login";
  state.generateLink.mockResolvedValue({ data: { properties: { email_otp: "123456" } }, error: null });
  state.ip = "192.0.2.10";
  state.counterUnavailable = false;
  state.captchaProofAllowed = true;
  state.requestUrl = "https://civicheck.test/auth/callback?code=test-code";
  state.signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  state.createUser.mockResolvedValue({ error: { code: "email_exists", message: "Email already registered" } });
  state.oauth.mockResolvedValue({ data: { url: "https://accounts.google.com/test" }, error: null });
  state.exchangeCode.mockResolvedValue({ data: { user: { id: "applicant", email: credentials.email, email_confirmed_at: "2026-01-01", app_metadata: { provider: "google" }, identities: [{ provider: "google", identity_data: { email_verified: true } }] } }, error: null });
  state.signOut.mockResolvedValue({ error: null });
});

describe("login and recovery security", () => {
  it("limits one IP to 20 failures across accounts, without penalizing successful logins", async () => {
    for (let i = 0; i < 21; i++) {
      await loginWithEmailFn({ data: { ...credentials, email: `person${i}@example.test` } });
    }
    expect(state.signIn).toHaveBeenCalledTimes(20);
    state.ip = "192.0.2.90";
    state.signIn.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    for (let i = 0; i < 25; i++) expect(await loginWithEmailFn({ data: credentials })).toMatchObject({ error: false });
  });

  it("notifies once at 30 account failures and never hard-locks another IP", async () => {
    for (let i = 0; i < 30; i++) {
      state.ip = `192.0.2.${i + 1}`;
      await loginWithEmailFn({ data: credentials });
    }
    await Promise.all(state.background);
    expect(state.sendEmail).toHaveBeenCalledOnce();
    state.ip = "192.0.2.100";
    const started = Date.now();
    state.signIn.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null });
    expect(await loginWithEmailFn({ data: credentials })).toMatchObject({ error: false });
    expect(Date.now() - started).toBeGreaterThanOrEqual(450);
    await loginWithEmailFn({ data: credentials });
    expect(state.sendEmail).toHaveBeenCalledOnce();
  });

  it("performs a matching-cost dummy comparison for unknown emails with the same public error", async () => {
    const known = await loginWithEmailFn({ data: credentials });
    expect(state.dummyCompare).not.toHaveBeenCalled();
    state.needsDummy = true;
    const missing = await loginWithEmailFn({ data: { ...credentials, email: "missing@example.test" } });
    expect(state.dummyCompare).toHaveBeenCalledWith(credentials.password, expect.stringMatching(/^\$2b\$10\$/));
    expect(missing).toEqual(known);
    expect(missing).toHaveProperty("message", "Invalid email or password");
  });

  it("expires abandoned reservations and rejects replayed completions", async () => {
    const args = [bucketKey("sign-in:pair", "pair"), bucketKey("sign-in:ip", "ip"), bucketKey("sign-in:account", "account")];
    const reserve = () => db.query<{ value: { allowed: boolean; attemptId: string } }>("select public.reserve_login_attempt($1,$2,$3) as value", args);
    const first = (await reserve()).rows[0].value;
    await db.query("select public.finish_login_attempt($1, false)", [first.attemptId]);
    await expect(db.query("select public.finish_login_attempt($1, false)", [first.attemptId])).rejects.toThrow();
    for (let i = 0; i < 4; i++) await reserve();
    expect((await reserve()).rows[0].value.allowed).toBe(false);
    await db.exec("update public.rate_limit_hits set lease_until = now() - interval '1 second' where lease_until is not null");
    expect((await reserve()).rows[0].value.allowed).toBe(true);
  });

  it("keeps security RPCs private and never returns hashes in account metadata", async () => {
    const grants = await db.query<{ permitted: boolean }>("select has_function_privilege('anon', 'public.login_account_security_info(text)', 'execute') or has_function_privilege('authenticated', 'public.reserve_login_attempt(text,text,text)', 'execute') as permitted");
    expect(grants.rows[0].permitted).toBe(false);
    await expect(db.query("select public.login_account_security_info('missing@example.test')")).rejects.toThrow();
    await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
    const info = await db.query<{ value: unknown }>("select public.login_account_security_info('missing@example.test') as value");
    expect(info.rows[0].value).toEqual({ email: null, needsDummyPassword: true, bcryptCost: 10 });
    await db.exec("select set_config('request.jwt.claims', '{}', false)");
  });
  it("requires invisible CAPTCHA on every password and recovery request before counters or Auth", async () => {
    for (const token of [undefined, "invalid"]) {
      expect(await loginWithEmailFn({ data: { ...credentials, "g-recaptcha-response": token } })).toMatchObject({ error: true, captchaError: true });
      expect(await forgotPasswordFn({ data: { email: credentials.email, "g-recaptcha-response": token } })).toMatchObject({ error: true, captchaError: true });
    }
    expect(state.signIn).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("keeps login Google CAPTCHA-free and independent of password lockout", async () => {
    for (let i = 0; i < 5; i++) await loginWithEmailFn({ data: credentials });
    expect(await loginWithOAuthFn({ data: { provider: "google", intent: "login", email: credentials.email } })).toHaveProperty("url");
    expect(await handleCallback()).toMatchObject({ error: false });
    expect(state.commitCookies).toHaveBeenCalledOnce();
  });

  it("retains signup CAPTCHA and rejects callbacks without their initiation proof", async () => {
    expect(await signupFn({ data: { ...signup, captchaToken: undefined } })).toMatchObject({ error: true, captchaError: true });
    expect(await loginWithOAuthFn({ data: { provider: "google", intent: "signup" } })).toMatchObject({ error: true, captchaError: true });
    state.captchaProofAllowed = false;
    expect(await handleCallback()).toMatchObject({ error: true });
    expect(state.exchangeCode).not.toHaveBeenCalled();
  });

  it("rejects a Google identity with an unverified provider email", async () => {
    state.exchangeCode.mockResolvedValueOnce({ data: { user: { email: credentials.email, email_confirmed_at: "2026-01-01", app_metadata: { provider: "google" }, identities: [{ provider: "google", identity_data: { email_verified: false } }] } }, error: null });
    expect(await handleCallback()).toMatchObject({ error: true });
    expect(state.commitCookies).not.toHaveBeenCalled();
  });

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

  it("shares casing within one IP but allows the owner from a different IP", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await loginWithEmailFn({ data: credentials });
    expect(await loginWithEmailFn({ data: { ...credentials, email: credentials.email.toUpperCase() } })).toHaveProperty("lockedUntil");
    state.ip = "192.0.2.20";
    state.signIn.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null });
    expect(await loginWithEmailFn({ data: credentials })).toMatchObject({ error: false });
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
    expect(state.rpc.mock.calls.some(([, args]) => args.p_bucket?.startsWith("otp-send:"))).toBe(false);
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
