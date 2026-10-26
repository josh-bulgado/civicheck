import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRequest } from "@tanstack/react-start/server";
import { getAppUrl } from "./app-url";

vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_URL", "https://civicheck.vercel.app/");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "civicheck.vercel.app");
  vi.stubEnv("VERCEL_URL", "civicheck-preview.vercel.app");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("app URL for authentication", () => {
  it.each([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:5173",
    "http://[::1]:3000",
    "https://localhost:3000",
  ])("keeps local development on %s despite production env values", (origin) => {
    vi.mocked(getRequest).mockReturnValue(new Request(`${origin}/login`));

    expect(getAppUrl()).toBe(origin);
  });

  it.each([
    "https://attacker.example",
    "https://localhost.attacker.example",
    "https://127.0.0.1.attacker.example",
  ])("does not trust a non-loopback request origin: %s", (origin) => {
    vi.mocked(getRequest).mockReturnValue(new Request(`${origin}/login`));

    expect(getAppUrl()).toBe("https://civicheck.vercel.app");
  });

  it("ignores forwarded headers when resolving a local callback", () => {
    vi.mocked(getRequest).mockReturnValue(
      new Request("http://localhost:3000/login", {
        headers: {
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("uses the configured production URL without consulting the request", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getAppUrl()).toBe("https://civicheck.vercel.app");
    expect(getRequest).not.toHaveBeenCalled();
  });

  it("retains the Vercel production and preview fallbacks", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", undefined);

    expect(getAppUrl()).toBe("https://civicheck.vercel.app");

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getAppUrl()).toBe("https://civicheck-preview.vercel.app");
  });
});
