import { createHash } from "node:crypto";
import type { CookieOptions } from "@supabase/ssr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";
import { getSupabaseServerClient, setSessionScope } from "./supabase";

const requestState = vi.hoisted(() => ({
  url: "http://localhost:3000/login",
  cookies: new Map<string, { value: string; options: CookieOptions }>(),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request(requestState.url),
  getCookie: (name: string) => requestState.cookies.get(name)?.value,
  getCookies: () =>
    Object.fromEntries(
      [...requestState.cookies].map(([name, cookie]) => [name, cookie.value]),
    ),
  setCookie: (name: string, value: string, options: CookieOptions) => {
    if (options.maxAge === 0) requestState.cookies.delete(name);
    else requestState.cookies.set(name, { value, options });
  },
  deleteCookie: (name: string) => requestState.cookies.delete(name),
  setResponseHeader: vi.fn(),
}));

beforeEach(() => {
  requestState.cookies.clear();
  vi.stubEnv("APP_URL", "https://civicheck.vercel.app");
  vi.stubEnv("SUPABASE_URL", "https://oauth-test.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase OAuth cookies and callback", () => {
  it.each([
    { mode: "development", origin: "http://localhost:3000", secure: false },
    { mode: "production", origin: "https://civicheck.vercel.app", secure: true },
  ])("exchanges the same PKCE verifier on $origin", async ({ mode, origin, secure }) => {
    vi.stubEnv("NODE_ENV", mode);
    requestState.url = `${origin}/login`;
    setSessionScope(false);

    const startClient = getSupabaseServerClient({ sessionOnly: false });
    const { data, error } = await startClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getAppUrl()}/auth/callback` },
    });
    expect(error).toBeNull();
    const authorizationUrl = new URL(data.url!);
    expect(authorizationUrl.searchParams.get("redirect_to")).toBe(
      `${origin}/auth/callback`,
    );

    const verifierCookie = [...requestState.cookies].find(([name]) =>
      name.endsWith("-code-verifier"),
    )?.[1];
    expect(verifierCookie?.value).toBeTruthy();
    expect(Boolean(verifierCookie?.options.secure)).toBe(secure);
    expect(verifierCookie?.options.sameSite).toBe("lax");
    expect(verifierCookie?.options.path).toBe("/");

    // A separate callback request/client must read the verifier cookie written
    // before leaving for Google. Stub only the remote token endpoint.
    requestState.url = `${origin}/auth/callback?code=test-auth-code`;
    const tokenEndpoint = vi.fn(async () =>
      Response.json({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: "test-user" },
      }),
    );
    vi.stubGlobal("fetch", tokenEndpoint);

    const callbackClient = getSupabaseServerClient();
    const result = await callbackClient.auth.exchangeCodeForSession("test-auth-code");
    expect(result.error).toBeNull();
    expect(result.data.session?.access_token).toBe("test-access-token");
    expect(tokenEndpoint).toHaveBeenCalledOnce();

    const [endpoint, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(endpoint)).toContain("/auth/v1/token?grant_type=pkce");
    const body = JSON.parse(init!.body as string);
    expect(body.auth_code).toBe("test-auth-code");
    expect(createHash("sha256").update(body.code_verifier).digest("base64url")).toBe(
      authorizationUrl.searchParams.get("code_challenge"),
    );
  });
});
