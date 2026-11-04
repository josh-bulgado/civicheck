import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieOptions } from "@supabase/ssr";

const state = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), findUser: vi.fn(), updateUser: vi.fn(), mail: vi.fn(),
  clearCookies: vi.fn(), verifyCaptcha: vi.fn(),
  background: [] as Promise<unknown>[],
  cookies: new Map<string, { value: string; options: CookieOptions }>(),
  unavailable: false, ip: "192.0.2.10",
}));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ validator: () => ({ handler: (handler: unknown) => handler }) }) }));
vi.mock("@tanstack/react-start/server", () => ({
  setResponseHeader: vi.fn(),
  getCookie: (name: string) => state.cookies.get(name)?.value,
  setCookie: (name: string, value: string, options: CookieOptions) => state.cookies.set(name, { value, options }),
  deleteCookie: (name: string) => state.cookies.delete(name),
}));
vi.mock("@vercel/functions", () => ({ waitUntil: (work: Promise<unknown>) => state.background.push(work) }));
vi.mock("~/server/client-ip", () => ({ getClientIp: () => state.ip }));
vi.mock("~/utils/supabase", () => ({
  getSupabaseAdminClient: () => ({ rpc: state.rpc, from: state.from, auth: { admin: { updateUserById: state.updateUser } } }),
  getSupabaseServerClient: vi.fn(), getSupabaseStatelessClient: vi.fn(),
  clearSessionScope: vi.fn(), setSessionScope: vi.fn(), commitSupabaseCookies: vi.fn(),
  clearSupabaseAuthCookies: state.clearCookies,
  secureCookiesEnabled: () => true,
}));
vi.mock("~/server/auth-users", () => ({ findAuthUserByEmail: state.findUser }));
vi.mock("~/utils/app-url", () => ({ getAppUrl: () => "https://app.test" }));
vi.mock("~/utils/resend", () => ({ sendEmail: state.mail }));
vi.mock("~/utils/email-template", () => ({ renderOtpEmail: (input: unknown) => JSON.stringify(input), renderVerificationEmail: vi.fn(), renderVerificationEmailText: vi.fn() }));
vi.mock("./captcha.server", () => ({ verifyInvisibleCaptcha: state.verifyCaptcha, verifyCaptcha: vi.fn(), issueOAuthCaptchaProof: vi.fn() }));
vi.mock("~/features/system-admin/security-center.server", () => ({ recordAuthenticationSecurityEvent: vi.fn(), recordSessionStarted: vi.fn() }));

import { forgotPasswordFn, resetPasswordFn, verifyRecoveryOtpFn } from "./auth.mutations";
import { generateRecoveryCode } from "./recovery.server";
import { RECOVERY_CONFIRMATION, RECOVERY_INVALID_CODE, RECOVERY_WRONG_CODE } from "./recovery";

const db = new PGlite();
const user = { id: "11111111-1111-4111-8111-111111111111", email: "owner@example.test", email_confirmed_at: "2026-01-01" };
const request = { email: user.email, "g-recaptcha-response": "valid" };
const drain = () => Promise.all(state.background);
const newestCode = () => JSON.parse(state.mail.mock.calls.at(-1)![0].html).code as string;
const send = async () => { const response = await forgotPasswordFn({ data: request }); await drain(); return response; };
const check = (token: string) => verifyRecoveryOtpFn({ data: { email: user.email, token } });
const ageSend = () => db.exec("update public.rate_limit_hits set hit_at = hit_at - interval '61 seconds' where bucket like 'recovery-send:%'");

beforeAll(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table auth.sessions(id uuid, user_id uuid); create table public.profiles(id uuid primary key);");
  for (const file of ["20261027121000_add_rate_limits.sql", "20261001130000_enforce_session_revocation.sql", "20261104162416_harden_recovery_codes.sql"]) {
    await db.exec(readFileSync(new URL(`../../../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  state.rpc.mockImplementation(async (name, args) => {
    if (state.unavailable) return { data: null, error: { code: "UNAVAILABLE" } };
    const calls: Record<string, [string, unknown[]]> = {
      reserve_recovery_send: ["select public.reserve_recovery_send($1,$2,$3,$4) as value", [args.p_email_bucket, args.p_ip_bucket, args.p_id, args.p_code_hash]],
      finish_recovery_code_check: ["select public.finish_recovery_code_check($1,$2,$3,$4) as value", [args.p_email_bucket, args.p_id, args.p_matched, args.p_grant_hash]],
      consume_password_reset_grant: ["select public.consume_password_reset_grant($1,$2) as value", [args.p_id, args.p_grant_hash]],
      consume_rate_limit: ["select public.consume_rate_limit($1,$2,$3) as value", [args.p_bucket, args.p_limit, args.p_window_seconds]],
      revoke_user_sessions: ["select public.revoke_user_sessions($1) as value", [args.target_user_id]],
    };
    const [sql, params] = calls[name];
    const result = await db.query<{ value: unknown }>(sql, params);
    return { data: result.rows[0].value, error: null };
  });
  state.from.mockImplementation((table: string) => {
    if (table !== "password_recovery_challenges") throw new Error(`Unexpected table ${table}`);
    let columns = "*";
    let updates: Record<string, unknown> | null = null;
    const clauses: string[] = [];
    const values: unknown[] = [];
    const condition = (column: string, operator: string, value: unknown) => {
      values.push(value); clauses.push(`${column} ${operator} $${values.length}`); return query;
    };
    const query = {
      select: (selection: string) => { columns = selection; return query; },
      update: (input: Record<string, unknown>) => { updates = input; return query; },
      eq: (column: string, value: unknown) => condition(column, "=", value),
      gt: (column: string, value: unknown) => condition(column, ">", value),
      lt: (column: string, value: unknown) => condition(column, "<", value),
      is: (column: string) => { clauses.push(`${column} is null`); return query; },
      maybeSingle: async () => {
        if (state.unavailable) return { data: null, error: { code: "UNAVAILABLE" } };
        const assignments = Object.entries(updates ?? {}).map(([key, value]) => {
          values.push(value); return `${key} = $${values.length}`;
        });
        const sql = updates ? `update public.password_recovery_challenges set ${assignments.join(",")} where ${clauses.join(" and ")} returning ${columns}`
          : `select ${columns} from public.password_recovery_challenges where ${clauses.join(" and ")}`;
        const result = await db.query(sql, values);
        return { data: result.rows[0] ?? null, error: null };
      },
    };
    return query;
  });
});
beforeEach(async () => {
  await db.exec("truncate public.password_recovery_challenges, public.rate_limit_hits, public.profiles, auth.users, auth.sessions cascade");
  await db.query("insert into auth.users(id) values ($1);", [user.id]);
  await db.query("insert into public.profiles(id) values ($1);", [user.id]);
  vi.clearAllMocks(); state.cookies.clear(); state.background = []; state.unavailable = false; state.ip = "192.0.2.10";
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("SUPABASE_SECRET_KEY", "recovery-test-signing-secret");
  state.findUser.mockImplementation(async (_admin, email) => email === user.email ? user : null);
  state.updateUser.mockResolvedValue({ data: { user }, error: null });
  state.verifyCaptcha.mockImplementation(async token => token === "valid" ? { error: false } : { error: true, captchaError: true, message: "Please try verification again." });
});
afterEach(async () => { await drain(); vi.unstubAllEnvs(); });
afterAll(() => db.close());

describe("recovery security", () => {
  it("rejects missing/invalid CAPTCHA before counters, account lookup or mail", async () => {
    for (const token of [undefined, "invalid"]) expect(await forgotPasswordFn({ data: { ...request, "g-recaptcha-response": token } })).toHaveProperty("captchaError", true);
    expect(state.rpc).not.toHaveBeenCalled(); expect(state.findUser).not.toHaveBeenCalled(); expect(state.mail).not.toHaveBeenCalled();
  });
  it("returns identical acknowledgement for real and missing emails without waiting for lookup", async () => {
    let release!: (value: unknown) => void;
    state.findUser.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const real = await forgotPasswordFn({ data: request });
    expect(real).toEqual({ error: false, message: RECOVERY_CONFIRMATION, retryAfterSeconds: 60 });
    expect(state.mail).not.toHaveBeenCalled(); release(user); await drain();
    expect(await forgotPasswordFn({ data: { ...request, email: "missing@example.test" } })).toEqual(real);
    await drain(); expect(state.mail).toHaveBeenCalledOnce();
  });
  it("stores only hashes, uses eight random digits, and expires after ten minutes", async () => {
    await send(); const code = newestCode(); expect(code).toMatch(/^\d{8}$/);
    expect(generateRecoveryCode()).toMatch(/^\d{8}$/);
    const rows = await db.query<{ code_hash: string; seconds: number }>("select code_hash, extract(epoch from expires_at - now())::integer as seconds from public.password_recovery_challenges");
    expect(rows.rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/); expect(rows.rows[0].code_hash).not.toBe(code);
    expect(rows.rows[0].seconds).toBeGreaterThan(590); expect(rows.rows[0].seconds).toBeLessThanOrEqual(600);
    await db.exec("update public.password_recovery_challenges set expires_at = now() - interval '1 second'");
    expect(await check(code)).toMatchObject({ error: true, message: RECOVERY_INVALID_CODE });
  });
  it("invalidates the code after exactly five wrong guesses, including parallel guesses", async () => {
    await send(); const code = newestCode(); const wrong = code === "00000000" ? "99999999" : "00000000";
    for (let i = 0; i < 4; i++) expect(await check(wrong)).toMatchObject({ error: true, message: RECOVERY_WRONG_CODE });
    expect(await check(wrong)).toMatchObject({ error: true, codeInvalid: true, message: RECOVERY_INVALID_CODE });
    expect(await check(code)).toMatchObject({ error: true, message: RECOVERY_INVALID_CODE });
    await ageSend(); await send(); const second = newestCode();
    await Promise.all(Array.from({ length: 8 }, () => check(second === "11111111" ? "22222222" : "11111111")));
    const row = await db.query<{ wrong_attempts: number; code_hash: string | null }>("select wrong_attempts, code_hash from public.password_recovery_challenges");
    expect(row.rows[0]).toEqual({ wrong_attempts: 5, code_hash: null });
  });
  it("allows the correct fifth submission and consumes a correct code only once", async () => {
    await send(); const code = newestCode();
    for (let i = 0; i < 4; i++) await check(code === "00000000" ? "99999999" : "00000000");
    const replies = await Promise.all([check(code), check(code)]);
    expect(replies.filter(reply => !reply.error)).toHaveLength(1);
    const cookie = state.cookies.get("civicheck-password-reset")!;
    expect(cookie.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
    expect(cookie.value).not.toContain(code);
    const stored = await db.query<{ reset_grant_hash: string; code_hash: null }>("select reset_grant_hash, code_hash from public.password_recovery_challenges");
    expect(stored.rows[0].code_hash).toBeNull(); expect(stored.rows[0].reset_grant_hash).not.toBe(cookie.value.split(".")[1]);
  });
  it("enforces the cooldown, three sends per hour, and ten sends per IP", async () => {
    await send(); await send(); expect(state.mail).toHaveBeenCalledOnce();
    for (let i = 0; i < 2; i++) { await ageSend(); await send(); }
    await ageSend(); expect(await send()).toMatchObject({ error: false, message: RECOVERY_CONFIRMATION });
    expect(state.mail).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 12; i++) await forgotPasswordFn({ data: { ...request, email: `missing${i}@example.test` } });
    const rows = await db.query<{ count: number }>("select count(*)::integer as count from public.rate_limit_hits where bucket like 'recovery-send:ip:%'");
    expect(rows.rows[0].count).toBe(10);
  });
  it("admits only one simultaneous send and replaces older codes/grants on resend", async () => {
    await Promise.all(Array.from({ length: 12 }, () => forgotPasswordFn({ data: request }))); await drain();
    expect(state.mail).toHaveBeenCalledOnce(); const oldCode = newestCode();
    await check(oldCode); const oldGrant = state.cookies.get("civicheck-password-reset")!;
    await ageSend(); await send();
    expect(await check(oldCode)).toHaveProperty("error", true);
    state.cookies.set("civicheck-password-reset", oldGrant);
    expect(await resetPasswordFn({ data: { password: "NewPassword123!" } })).toHaveProperty("error", true);
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(await check(newestCode())).toHaveProperty("error", false);
  });
  it("requires a fresh grant, changes the password once, revokes every session, and notifies the owner", async () => {
    expect(await resetPasswordFn({ data: { password: "NewPassword123!" } })).toHaveProperty("error", true);
    await send(); await check(newestCode());
    const cookie = state.cookies.get("civicheck-password-reset")!;
    await db.query("insert into auth.sessions(id,user_id) values (gen_random_uuid(),$1), (gen_random_uuid(),$1)", [user.id]);
    expect(await resetPasswordFn({ data: { password: "NewPassword123!" } })).toHaveProperty("error", false);
    await drain(); expect(state.updateUser).toHaveBeenCalledWith(user.id, { password: "NewPassword123!" });
    expect(state.clearCookies).toHaveBeenCalledOnce();
    const sessions = await db.query<{ count: number }>("select count(*)::integer as count from auth.sessions");
    expect(sessions.rows[0].count).toBe(0);
    const profile = await db.query<{ sessions_revoked_at: string | null }>("select sessions_revoked_at from public.profiles");
    expect(profile.rows[0].sessions_revoked_at).not.toBeNull();
    expect(state.mail.mock.calls.at(-1)![0]).toMatchObject({ to: user.email, subject: "Your CiviCheck password was changed" });
    state.cookies.set("civicheck-password-reset", cookie);
    expect(await resetPasswordFn({ data: { password: "AnotherPassword123!" } })).toHaveProperty("error", true);
    expect(state.updateUser).toHaveBeenCalledOnce();
  });
  it("fails closed on storage failure and keeps challenge/RPC access private", async () => {
    state.unavailable = true; expect(await forgotPasswordFn({ data: request })).toHaveProperty("error", true);
    expect(state.findUser).not.toHaveBeenCalled(); expect(state.mail).not.toHaveBeenCalled();
    const grants = await db.query<{ allowed: boolean }>("select has_table_privilege('anon','public.password_recovery_challenges','select') or has_function_privilege('authenticated','public.finish_recovery_code_check(text,uuid,boolean,text)','execute') as allowed");
    expect(grants.rows[0].allowed).toBe(false);
  });
});
