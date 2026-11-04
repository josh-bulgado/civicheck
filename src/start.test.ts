import { afterEach, expect, it, vi } from "vitest";

type HeaderMiddleware = (options: {
  next: (options?: unknown) => Promise<{ response: Response }>;
}) => Promise<{ response: Response }>;

const state = vi.hoisted(() => ({ headers: undefined as HeaderMiddleware | undefined }));
vi.mock("@tanstack/react-start", () => ({
  createCsrfMiddleware: vi.fn(),
  createMiddleware: () => ({ server: (handler: HeaderMiddleware) => {
    state.headers = handler;
    return handler;
  } }),
  createStart: (factory: () => unknown) => factory(),
}));
import "./start";

afterEach(() => vi.unstubAllEnvs());

it("allows Google's checkbox dependencies through the production CSP using scoped paths", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("SUPABASE_URL", "https://civicheck.supabase.co");
  const result = await state.headers!({ next: async () => ({ response: new Response("Page") }) });
  const policy = result.response.headers.get("Content-Security-Policy")!;
  const directives = Object.fromEntries(policy.split("; ").map(directive => {
    const [name, ...sources] = directive.split(" ");
    return [name, sources];
  }));
  expect(directives["script-src"]).toEqual(expect.arrayContaining([
    "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/",
  ]));
  expect(directives["frame-src"]).toEqual([
    "'self'", "blob:", "https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/",
  ]);
  expect(directives["connect-src"]).toContain("https://www.google.com/recaptcha/");
  expect(directives["connect-src"]).not.toContain("https://www.google.com");
  expect(directives["script-src"]).not.toContain("'unsafe-inline'");
});
