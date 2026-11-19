import { expect, test } from "@playwright/test";

for (const width of [320, 393, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`application header fits ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/?kind=header&theme=${theme}`);
      const action = page.getByRole("button", { name: "Change service", exact: true });
      await expect(action).toHaveCount(1);
      await expect(action).toBeVisible();
      const headerAction = page.locator("header").getByRole("button", { name: "Change service", exact: true });
      if (width < 768) await expect(headerAction).toBeVisible();
      else await expect(headerAction).toBeHidden();
      await expect(page.getByText(/Step \d of 4/)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "More about this application" })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Application progress" }).getByRole("listitem")).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/mobile-dialogs/header-${width}-${theme}.png` });
    });
  }
}

test("the last step retains accessible progress with the mobile action", async ({ page }) => {
  await page.goto("/?kind=header&step=4");
  await expect(page.locator('[aria-current="step"]')).toContainText("Review and submit");
  await expect(page.locator("header").getByRole("button", { name: "Change service", exact: true })).toBeVisible();
});

test("the loading header keeps the mobile action visible and disabled", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/?kind=header-pending");
  await expect(page.getByRole("button", { name: "Change service", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("mobile Change service offers keeping the draft before navigation", async ({ page }) => {
  await page.goto("/?kind=header");
  await page.getByRole("button", { name: "Change service", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keep your draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Change service", exact: true }).click();
  await page.getByRole("button", { name: "Keep draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
  await expect(page.getByLabel("Draft", { exact: true })).toHaveText("Retained");
});

test("discard still requires confirmation before switching services", async ({ page }) => {
  await page.goto("/?kind=header");
  await page.getByRole("button", { name: "Change service", exact: true }).click();
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Discard this draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
  await expect(page.getByLabel("Draft", { exact: true })).toHaveText("Discarded");
});

test("the logo keeps its dashboard destination", async ({ page }) => {
  await page.goto("/?kind=header");
  await page.getByRole("link", { name: "CiviCheck, back to your dashboard" }).click();
  await page.getByRole("button", { name: "Keep draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});
