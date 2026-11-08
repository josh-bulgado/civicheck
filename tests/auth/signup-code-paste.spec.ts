import { test, expect, type Page } from "@playwright/test";

const VALID_CODE = "87654321";
const WRONG_CODE_MESSAGE = "That code isn't right. Check the email and try again.";

async function openVerification(
  page: Page,
  { holdVerification = false, holdResend = false, validCode = VALID_CODE } = {},
) {
  const checks: string[] = [];
  let verified = false;
  let releaseVerification!: () => void;
  let releaseResend!: () => void;
  const verificationGate = new Promise<void>(resolve => { releaseVerification = resolve; });
  const resendGate = new Promise<void>(resolve => { releaseResend = resolve; });

  await page.routeWebSocket(/supabase\.example\.test/, socket => socket.close());
  await page.route("**/_serverFn/**", async route => {
    const encoded = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const name = String(JSON.parse(Buffer.from(encoded, "base64url").toString()).export);
    let result: unknown = null;
    if (name.startsWith("verifySignupOtpFn")) {
      const body = route.request().postData() ?? "";
      checks.push(body);
      if (holdVerification) await verificationGate;
      verified = body.includes(validCode);
      result = verified ? { error: false } : { error: true, message: WRONG_CODE_MESSAGE };
    } else if (name.startsWith("resendSignupOtpFn")) {
      if (holdResend) await resendGate;
      result = { error: false };
    } else if (name.startsWith("fetchUser")) {
      result = verified ? {
        id: "paste-test-user", email: "paste@example.test", role: "applicant",
        firstName: "Paste", middleName: "", hasNoMiddleName: true,
        lastName: "Test", suffix: "", dateOfBirth: "", sex: "", phoneNumber: "",
        accountStatus: "active", createdAt: "2026-01-01T00:00:00Z",
        lastLoginAt: null, welcomeTutorialSeen: true, avatarUrl: null,
      } : null;
    } else if (name.startsWith("getMyRequestsFn")) {
      result = [];
    } else if (name.startsWith("getUnreadNotificationSummaryFn")) {
      result = { count: 0, requestIds: [] };
    } else if (name.startsWith("getSupabaseBrowserConfig")) {
      result = { url: "https://supabase.example.test", publishableKey: "test-publishable-key" };
    } else if (name.startsWith("getInvisibleCaptchaConfigFn")) {
      result = { siteKey: null, error: null };
    }
    await route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify({ result }),
    });
  });

  await page.goto("/login");
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await page.waitForFunction(() => !!window.__TSR_ROUTER__);
  await page.evaluate(async sendCodeOnArrival => {
    const modulePath = "/src/features/auth/pending-verification.ts";
    const { setPendingVerification } = await import(modulePath);
    setPendingVerification({
      email: "paste@example.test", password: "Browser-fixture-only1!", sendCodeOnArrival,
    });
    await window.__TSR_ROUTER__!.navigate({ to: "/verify-email" });
  }, holdResend);
  await page.getByRole("heading", { name: "Check your email" }).waitFor();
  return { checks, releaseVerification, releaseResend };
}

async function pasteCode(page: Page, text: string) {
  const input = page.getByLabel("Verification code", { exact: true });
  await input.focus();
  await input.evaluate((element, pasted) => {
    const data = new DataTransfer();
    data.setData("text/plain", pasted);
    element.dispatchEvent(new ClipboardEvent("paste", {
      clipboardData: data, bubbles: true, cancelable: true,
    }));
  }, text);
}

test("pasting a complete code checks once and waits for server acceptance", async ({ page }) => {
  const fixture = await openVerification(page, { holdVerification: true });
  await pasteCode(page, VALID_CODE);
  await expect(page.getByRole("button", { name: "Verifying" })).toBeDisabled();
  await expect(page.getByLabel("Verification code", { exact: true })).toHaveAttribute("readonly", "");
  await expect(page.locator(".civic-otp-slot").first()).toHaveCSS("animation-name", "civic-otp-checking");
  await pasteCode(page, VALID_CODE);
  await page.getByLabel("Verification code", { exact: true }).press("Enter");
  await expect.poll(() => fixture.checks.length).toBe(1);
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".civic-otp-slot").first()).toHaveCSS("animation-name", "none");
  fixture.releaseVerification();
  await expect(page.getByRole("heading", { name: "Welcome back, Paste" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.checks).toHaveLength(1);
});

test("a rejected paste stays editable without automatically retrying", async ({ page }) => {
  const fixture = await openVerification(page);
  await pasteCode(page, "11111111");
  await expect(page.locator("#otp-error")).toHaveText(WRONG_CODE_MESSAGE);
  await expect(page.getByText(WRONG_CODE_MESSAGE, { exact: true })).toHaveCount(1);
  await expect(page).toHaveURL(/\/verify-email$/);
  expect(fixture.checks).toHaveLength(1);
  await page.getByLabel("Verification code", { exact: true }).fill(VALID_CODE);
  await expect(page.locator("#otp-error")).toHaveCount(0);
  expect(fixture.checks).toHaveLength(1);
  await page.getByRole("button", { name: "Confirm account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.checks).toHaveLength(2);
});

test("partial, oversized, and prose pastes require manual confirmation", async ({ page }) => {
  const fixture = await openVerification(page);
  const input = page.getByLabel("Verification code", { exact: true });
  await input.fill("1234");
  await pasteCode(page, "5678");
  await expect(input).toHaveValue("12345678");
  expect(fixture.checks).toHaveLength(0);
  for (const text of ["876543210", "Your code is 87654321"]) {
    await input.fill("");
    await pasteCode(page, text);
    await expect(input).toHaveValue(VALID_CODE);
    expect(fixture.checks).toHaveLength(0);
  }
  await pasteCode(page, " 8765-4321 ");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.checks).toHaveLength(1);
});

test("formatted pasted codes preserve leading zeroes", async ({ page }) => {
  const fixture = await openVerification(page, { validCode: "01234567" });
  await pasteCode(page, "0123 4567");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.checks).toHaveLength(1);
  expect(fixture.checks[0]).toContain("01234567");
});

test("pasting during resend cannot verify a code from the previous email", async ({ page }) => {
  const fixture = await openVerification(page, { holdResend: true });
  const input = page.getByLabel("Verification code", { exact: true });
  await expect(input).toHaveAttribute("readonly", "");
  await pasteCode(page, VALID_CODE);
  await expect(input).toHaveValue("");
  expect(fixture.checks).toHaveLength(0);
  fixture.releaseResend();
  await expect(input).not.toHaveAttribute("readonly");
  await pasteCode(page, VALID_CODE);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.checks).toHaveLength(1);
});
