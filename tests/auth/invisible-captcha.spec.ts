import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const serializer = require(require.resolve("seroval", {
  paths: [dirname(require.resolve("@tanstack/react-router"))],
})) as { toJSON: (value: unknown) => { t: unknown } };

declare global {
  interface Window {
    __captcha?: {
    executeCount: number; resetCount: number;
    callback: (token: string) => void;
    expire: () => void;
    fail: () => void;
    };
  }
}

async function mockServices(page: Page, configured = true) {
  const requests: { name: string; body: string }[] = [];
  await page.route("https://www.google.com/recaptcha/api.js**", route => route.fulfill({
    contentType: "application/javascript",
    body: `window.__captcha = { executeCount: 0, resetCount: 0 };
      window.grecaptcha = {
        render(host, options) {
          const badge = document.createElement('div');
          badge.className = 'grecaptcha-badge'; host.append(badge);
          window.__captcha.callback = options.callback;
          window.__captcha.expire = options['expired-callback'];
          window.__captcha.fail = options['error-callback'];
          return 1;
        },
        execute() { window.__captcha.executeCount++; },
        reset() { window.__captcha.resetCount++; }
      };
      window.civicheckRecaptchaLoaded();`,
  }));
  await page.route("**/_serverFn/**", async route => {
    const encoded = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const metadata = JSON.parse(Buffer.from(encoded, "base64url").toString());
    const name = String(metadata.export);
    let result: unknown;
    if (name.startsWith("getInvisibleCaptchaConfigFn")) {
      result = configured ? { siteKey: "browser-test-site", error: null }
        : { siteKey: null, error: "Security verification is not configured for this website." };
    } else if (name.startsWith("loginWithEmailFn")) {
      requests.push({ name: "login", body: route.request().postData() ?? "" });
      result = { error: true, message: "Invalid email or password", attemptsRemaining: 4 };
    } else if (name.startsWith("forgotPasswordFn")) {
      requests.push({ name: "recovery", body: route.request().postData() ?? "" });
      result = { error: false, message: "If an account exists, a reset code will arrive shortly." };
    } else if (name.startsWith("loginWithOAuthFn")) {
      requests.push({ name: "google", body: route.request().postData() ?? "" });
      result = { error: true, message: "Google test handoff" };
    } else {
      return route.continue();
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: JSON.stringify(serializer.toJSON({ result }).t),
    });
  });
  return requests;
}

async function completeCaptcha(page: Page, token: string) {
  await page.evaluate(value => window.__captcha!.callback(value), token);
}

test("login and recovery hooks survive client navigation and reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (/Invalid hook call|Cannot read properties of null.*useContext/.test(message.text())) errors.push(message.text());
  });
  await mockServices(page);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset code" })).toBeEnabled();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("login validates before execution, submits only from callback, and resets failed attempts", async ({ page }) => {
  const requests = await mockServices(page);
  await page.goto("/login");
  const button = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText("Please enter a valid email address")).toBeVisible();
  expect(await page.evaluate(() => window.__captcha!.executeCount)).toBe(0);
  await page.getByLabel("Email address", { exact: true }).fill("person@example.test");
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword1!");
  await button.click();
  await expect(page.getByRole("button", { name: "Signing in" })).toBeDisabled();
  expect(requests).toHaveLength(0);
  await page.locator("form").evaluate(form => (form as HTMLFormElement).requestSubmit());
  expect(await page.evaluate(() => window.__captcha!.executeCount)).toBe(1);
  await completeCaptcha(page, "first-single-use-token");
  await expect(page.getByText("Invalid email or password", { exact: true })).toBeVisible();
  await expect(button).toBeEnabled();
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toContain("g-recaptcha-response");
  expect(requests[0].body).toContain("first-single-use-token");
  expect(await page.evaluate(() => window.__captcha!.resetCount)).toBeGreaterThan(0);
  await button.click();
  await completeCaptcha(page, "second-single-use-token");
  await expect(button).toBeEnabled();
  expect(requests).toHaveLength(2);
  expect(requests[1].body).toContain("second-single-use-token");
  expect(requests[1].body).not.toContain("first-single-use-token");
});

test("privacy notice stays readable in both themes and badge uses visibility", async ({ page }) => {
  await mockServices(page);
  await page.goto("/login");
  const notice = page.locator(".recaptcha-notice");
  await expect(page.locator(".grecaptcha-badge")).toHaveCSS("visibility", "hidden");
  await expect(page.locator(".grecaptcha-badge")).not.toHaveCSS("display", "none");
  await expect(notice).toHaveCSS("color", "rgb(100, 116, 139)");
  await expect(notice.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "https://policies.google.com/privacy");
  await expect(notice.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "https://policies.google.com/terms");
  await page.screenshot({ path: "artifacts/login-light.png", fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(notice).toHaveCSS("color", "rgb(168, 181, 199)");
  await page.screenshot({ path: "artifacts/login-dark.png", fullPage: true });
});

test("Google login works independently when CAPTCHA configuration is missing", async ({ page }) => {
  const requests = await mockServices(page, false);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await expect(page.getByText("Security verification is not configured for this website.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByText("Google test handoff")).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].name).toBe("google");
  expect(requests[0].body).toContain("login");
  expect(requests[0].body).not.toContain("captchaToken");
  expect(requests[0].body).not.toContain("g-recaptcha-response");
});

test("recovery and resend each require a fresh callback token", async ({ page }) => {
  const requests = await mockServices(page);
  await page.clock.install();
  await page.goto("/forgot-password");
  const button = page.getByRole("button", { name: "Send reset code" });
  await expect(button).toBeEnabled();
  await button.click();
  expect(await page.evaluate(() => window.__captcha!.executeCount)).toBe(0);
  await page.getByLabel("Email address", { exact: true }).fill("person@example.test");
  await button.click();
  expect(requests).toHaveLength(0);
  await completeCaptcha(page, "recovery-first-token");
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  await expect(page.getByText("If an account exists for", { exact: false })).toBeVisible();
  expect(requests[0].body).toContain("recovery-first-token");
  // Advance only the resend cooldown; never contact Google or the mail API.
  for (let second = 0; second < 31; second++) await page.clock.runFor(1000);
  const resend = page.getByRole("button", { name: "Resend", exact: true });
  await expect(resend).toBeEnabled();
  await resend.click();
  expect(requests).toHaveLength(1);
  await completeCaptcha(page, "recovery-resend-token");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].body).toContain("recovery-resend-token");
  expect(requests[1].body).not.toContain("recovery-first-token");
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
});
