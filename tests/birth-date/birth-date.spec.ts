import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-14T04:00:00Z"));
});

for (const width of [320, 390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`uses a calendar without clipping at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/?theme=${theme}&value=2026-11-01`);
      const date = page.locator("#dynamic-event_date");
      await expect(date).toHaveText("November 1, 2026");
      await expect(page.getByRole("combobox")).toHaveCount(0);
      await date.click();
      const calendar = page.locator('[data-slot="popover-content"]');
      await expect(calendar).toBeVisible();
      await expect(calendar).toHaveAttribute("data-side", /^(bottom|top)$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('[data-day="11/5/2026"]').click();
      await expect(page.getByLabel("Saved date")).toHaveText("2026-11-05");
      await expect(calendar).toBeHidden();
      await expect(date).toHaveText("November 5, 2026");
      await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
    });
  }
}

test("supports keyboard opening and prevents future birth dates", async ({ page }) => {
  await page.goto("/");
  const date = page.locator("#dynamic-event_date");
  await date.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
  await expect(page.locator('[data-day="11/15/2026"]')).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(date).toBeFocused();
});

test("uses calendars for both marriage parties and birth-record questions", async ({ page }) => {
  await page.goto("/?kind=marriage");
  await expect(page.locator("#dynamic-bride_date_of_birth")).toHaveAttribute("aria-haspopup", "dialog");
  await expect(page.locator("#dynamic-groom_date_of_birth")).toHaveAttribute("aria-haspopup", "dialog");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.goto("/?kind=record");
  await expect(page.locator("#dynamic-event_date")).toHaveAttribute("aria-haspopup", "dialog");
});

test("requires a complete date after reset", async ({ page }) => {
  await page.goto("/?value=2026-11-01&mode=onChange");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Saved date")).toHaveText("No complete date");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});
