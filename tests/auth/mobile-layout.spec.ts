import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const serializer = require(require.resolve("seroval", {
  paths: [dirname(require.resolve("@tanstack/react-router"))],
})) as { toJSON: (value: unknown) => { t: unknown } };

declare global {
  interface Window {
    __mobileCaptcha: {
      size: string; renders: number; resets: number;
      complete: (token: string) => void; expire: () => void; fail: () => void;
    };
  }
}

test.use({ isMobile: true, hasTouch: true, reducedMotion: "reduce" });

async function mockVerification(page: Page, slow = false) {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  if (!slow) release();
  await page.route("https://www.google.com/recaptcha/api.js**", async route => {
    await ready;
    await route.fulfill({ contentType: "application/javascript", body: `
      window.__mobileCaptcha = {renders:0,resets:0};
      window.grecaptcha = {
        render(host, options) {
          const state = window.__mobileCaptcha;
          state.size = options.size; state.renders++;
          state.complete = options.callback;
          state.expire = options['expired-callback']; state.fail = options['error-callback'];
          if (options.size === 'invisible') {
            const badge = document.createElement('div'); badge.className = 'grecaptcha-badge'; host.append(badge);
          } else {
            const frame = document.createElement('div'); frame.dataset.testCaptcha = options.size;
            frame.style.cssText = 'width:'+(options.size==='compact'?164:304)+'px;height:'+(options.size==='compact'?144:78)+'px;background:#fafafa;color:#111;border:1px solid #ccc;display:flex;align-items:center;justify-content:center';
            const button = document.createElement('button'); button.type = 'button';
            button.textContent = 'Complete test verification'; button.onclick = () => options.callback('test-token');
            frame.append(button); host.append(frame);
          }
          return state.renders;
        },
        reset() { window.__mobileCaptcha.resets++; }, execute() {}
      }; window.civicheckRecaptchaLoaded();
    ` });
  });
  await page.route("**/_serverFn/**", async route => {
    const encoded = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const name = String(JSON.parse(Buffer.from(encoded, "base64url").toString()).export);
    let result: unknown;
    if (/^get(Invisible)?CaptchaConfigFn/.test(name)) result = { siteKey: "test-key", error: null };
    else if (name.startsWith("loginWithEmailFn")) result = { error: true, message: "Invalid email or password" };
    else if (name.startsWith("forgotPasswordFn")) result = { error: false, message: "Code sent", retryAfterSeconds: 60 };
    else return route.continue();
    await route.fulfill({ status: 200, headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: JSON.stringify(serializer.toJSON({ result }).t) });
  });
  return release;
}

async function checkPageWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [320, 360, 393, 640, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`sign-up verification fits ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 393 ? 852 : 800 });
      await page.addInitScript(theme => localStorage.setItem("civicheck-theme", theme), theme);
      await mockVerification(page);
      await page.goto("/signup");
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
      const widget = page.locator('[data-test-captcha="normal"]');
      await expect(widget).toBeVisible();
      await expect(page.getByRole("button", { name: "Open TanStack Devtools", exact: true })).toHaveCount(0);
      const box = (await widget.boundingBox())!;
      const form = (await page.locator(".register-container").boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(form.x);
      expect(box.x + box.width).toBeLessThanOrEqual(form.x + form.width);
      expect(box.height).toBeLessThanOrEqual(78);
      expect(Math.abs((box.x + box.width / 2) - (form.x + form.width / 2))).toBeLessThanOrEqual(1);
      await checkPageWidth(page);
      const consent = page.locator('label[for="agreeToTerms"]');
      expect((await consent.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const submit = page.getByRole("button", { name: "Sign up", exact: true });
      await expect(submit).toBeDisabled();
      await page.getByRole("button", { name: "Complete test verification" }).click();
      await expect(submit).toBeEnabled();
      await page.screenshot({ path: `artifacts/auth/signup-${width}-${theme}.png`, fullPage: true });
    });
  }
}

test("loading reserves the horizontal widget space", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const release = await mockVerification(page, true);
  await page.goto("/signup");
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Loading security verification" })).toBeVisible();
  const submit = page.getByRole("button", { name: "Sign up", exact: true });
  const before = (await submit.boundingBox())!.y;
  release();
  await expect(page.locator('[data-test-captcha="normal"]')).toBeVisible();
  expect((await submit.boundingBox())!.y).toBe(before);
});

test("unavailable verification shows a compact error with retry and keeps signup blocked", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockVerification(page);
  await page.route("**/_serverFn/**", async route => {
    const encoded = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const name = String(JSON.parse(Buffer.from(encoded, "base64url").toString()).export);
    if (!name.startsWith("getCaptchaConfigFn")) return route.fallback();
    const result = { siteKey: null, error: "Security verification is temporarily unavailable. Please try again shortly." };
    await route.fulfill({ status: 200, headers: { "content-type": "application/json", "x-tss-serialized": "true" }, body: JSON.stringify(serializer.toJSON({ result }).t) });
  });
  await page.goto("/signup");
  const error = page.getByRole("alert").filter({ hasText: "Security verification is temporarily unavailable" });
  await expect(error).toBeVisible();
  const consent = (await page.locator('label[for="agreeToTerms"]').boundingBox())!;
  expect((await error.boundingBox())!.y - (consent.y + consent.height)).toBeLessThan(48);
  await expect(page.getByRole("button", { name: "Retry verification" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeDisabled();
  await checkPageWidth(page);
});

test("rotation and keyboard changes preserve verification while the widget fits", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 800 });
  await mockVerification(page);
  await page.goto("/signup");
  await page.getByRole("button", { name: "Complete test verification" }).click();
  const submit = page.getByRole("button", { name: "Sign up", exact: true });
  await expect(submit).toBeEnabled();
  const renders = await page.evaluate(() => window.__mobileCaptcha.renders);
  await page.setViewportSize({ width: 393, height: 420 });
  await expect(submit).toBeEnabled();
  expect(await page.evaluate(() => window.__mobileCaptcha.renders)).toBe(renders);
  await page.setViewportSize({ width: 844, height: 393 });
  await expect(page.locator('[data-test-captcha="normal"]')).toBeVisible();
  await expect(submit).toBeEnabled();
  expect(await page.evaluate(() => window.__mobileCaptcha.renders)).toBe(renders);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(submit).toBeEnabled();
  await checkPageWidth(page);
  await page.evaluate(() => window.__mobileCaptcha.expire());
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Verification expired" })).toBeVisible();
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await checkPageWidth(page);
});

test("mobile login options and validation errors do not overlap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockVerification(page);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await page.getByRole("checkbox", { name: "Keep me signed in", exact: true }).check();
  await expect(page.locator(".login-session-note")).toBeVisible();
  const note = (await page.locator(".login-session-note").boundingBox())!;
  const forgot = (await page.getByRole("link", { name: "Forgot password?" }).boundingBox())!;
  expect(note.y + note.height).toBeLessThanOrEqual(forgot.y);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Please enter a valid email address")).toBeVisible();
  const error = (await page.locator("#email-error").boundingBox())!;
  const password = (await page.locator("#password").boundingBox())!;
  expect(error.y + error.height).toBeLessThanOrEqual(password.y);
  await checkPageWidth(page);
  await page.screenshot({ path: "artifacts/auth/login-320-errors.png", fullPage: true });
});

test("mobile recovery fields retain a 44px target and code entry waits for a tap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockVerification(page);
  await page.goto("/forgot-password");
  await expect(page.getByRole("button", { name: "Send reset code" })).toBeEnabled();
  const email = page.getByLabel("Email address", { exact: true });
  await email.fill("a.long.email.address.for.mobile@example.test");
  const groupHeight = await email.evaluate(element => element.closest('[data-slot="input-group"]')!.getBoundingClientRect().height);
  expect(groupHeight).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Send reset code" }).click();
  await page.evaluate(() => window.__mobileCaptcha.complete("recovery-test-token"));
  const code = page.getByLabel("Verification code", { exact: true });
  await expect(code).toBeVisible();
  await expect(code).not.toBeFocused();
  await code.fill("12345678");
  await expect(code).toHaveValue("12345678");
  await checkPageWidth(page);
});
