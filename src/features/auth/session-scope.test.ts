import { describe, expect, it } from "vitest";
import {
  applyCookiePolicy,
  enforcedScopeValue,
  isPersistentScope,
  PERSISTENT_SESSION_MAX_AGE_SECONDS,
  PERSISTENT_SESSION_VALUE,
  persistentMarkerOptions,
} from "./session-scope";

// Supabase writes its auth cookies with a 400 day Max-Age.
const SUPABASE_DEFAULT_MAX_AGE = 400 * 24 * 60 * 60;

describe("browser-only sessions (Keep me signed in unticked)", () => {
  it("drops the lifetime so the cookie ends with the browser", () => {
    const options = applyCookiePolicy(
      { path: "/", maxAge: SUPABASE_DEFAULT_MAX_AGE, expires: new Date() },
      { sessionOnly: true, secure: false },
    );
    expect(options.maxAge).toBeUndefined();
    expect(options.expires).toBeUndefined();
    expect(options.path).toBe("/");
  });
});

describe("persistent sessions (Keep me signed in ticked)", () => {
  it("caps Supabase's 400 days at the portal's limit", () => {
    const options = applyCookiePolicy(
      { path: "/", maxAge: SUPABASE_DEFAULT_MAX_AGE },
      { sessionOnly: false, secure: false },
    );
    expect(options.maxAge).toBe(PERSISTENT_SESSION_MAX_AGE_SECONDS);
    expect(PERSISTENT_SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it("never lengthens a shorter cookie", () => {
    const options = applyCookiePolicy(
      { maxAge: 600 },
      { sessionOnly: false, secure: false },
    );
    expect(options.maxAge).toBe(600);
  });

  it("does not turn a browser-only cookie into a lasting one", () => {
    const options = applyCookiePolicy({}, { sessionOnly: false, secure: false });
    expect(options.maxAge).toBeUndefined();
  });
});

describe("either way", () => {
  it("lets a removal expire", () => {
    for (const sessionOnly of [true, false]) {
      const options = applyCookiePolicy(
        { maxAge: 0 },
        { sessionOnly, secure: false },
      );
      expect(options.maxAge).toBe(0);
    }
  });

  it("forces Secure on when the app is served over HTTPS", () => {
    expect(
      applyCookiePolicy({}, { sessionOnly: true, secure: true }).secure,
    ).toBe(true);
  });
});

describe("the marker cookie", () => {
  it("only an explicit persistent value asks for a lasting session", () => {
    expect(isPersistentScope(PERSISTENT_SESSION_VALUE)).toBe(true);
    expect(isPersistentScope(undefined)).toBe(false);
    expect(isPersistentScope(null)).toBe(false);
    expect(isPersistentScope("")).toBe(false);
    expect(isPersistentScope("true")).toBe(false);
  });

  it("an internal role's enforced marker is not a persistent one", () => {
    expect(isPersistentScope(enforcedScopeValue("session-1"))).toBe(false);
  });

  it("is kept for as long as the cookies it governs", () => {
    expect(persistentMarkerOptions(true)).toMatchObject({
      maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
      secure: true,
      sameSite: "lax",
    });
  });
});
