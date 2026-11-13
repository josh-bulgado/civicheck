import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, part: string, value: string) {
  const control = page.getByRole("combobox", { name: part, exact: true });
  await control.click();
  await page.getByRole("option", { name: value, exact: true }).click();
  await expect(control).toBeFocused();
  await expect(page.locator('[data-slot="select-content"]:visible')).toHaveCount(0);
}

for (const width of [375, 1440]) {
  for (const theme of ["light", "dark"]) {
    for (const mode of ["onBlur", "onChange"]) {
      test(`validates only skipped date parts at ${width}px in ${theme} mode (${mode})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?theme=${theme}&mode=${mode}`);
        const month = page.getByRole("combobox", { name: "Month", exact: true });
        const day = page.getByRole("combobox", { name: "Day", exact: true });
        const year = page.getByRole("combobox", { name: "Year", exact: true });

        await month.click();
        await expect(page.getByRole("listbox")).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(page.locator('[role="combobox"][aria-invalid="true"]')).toHaveCount(0);
        await page.getByRole("option", { name: "September", exact: true }).click();
        await expect(month).toBeFocused();
        await expect(page.locator('[data-slot="select-content"]:visible')).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveCount(0);

        await day.click();
        await expect(page.getByRole("alert")).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(day).toBeFocused();
        await expect(page.locator('[data-slot="select-content"]:visible')).toHaveCount(0);
        await expect(day).toHaveAttribute("aria-invalid", "true");
        await expect(month).not.toHaveAttribute("aria-invalid", "true");
        await expect(year).not.toHaveAttribute("aria-invalid", "true");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await page.screenshot({ path: `artifacts/birth-date/${width}-${theme}-${mode}-skipped-day.png` });

        await page.keyboard.press("Tab");
        await expect(year).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(year).toHaveAttribute("aria-invalid", "true");
        await choose(page, "Day", "15");
        await expect(day).not.toHaveAttribute("aria-invalid", "true");
        await expect(year).toHaveAttribute("aria-invalid", "true");
        await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
        await choose(page, "Year", "2000");
        await expect(page.getByLabel("Saved date")).toHaveText("2000-09-15");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(page.locator('[role="combobox"][aria-invalid="true"]')).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
      });
    }
  }
}

test("validates an empty month only after leaving it", async ({ page }) => {
  await page.goto("/?mode=onBlur");
  const month = page.getByRole("combobox", { name: "Month", exact: true });
  await month.focus();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(month).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('[role="combobox"][aria-invalid="true"]')).toHaveCount(1);
  await choose(page, "Month", "September");
  await expect(month).not.toHaveAttribute("aria-invalid", "true");
  // Returning to Month leaves the empty Day control, so only Day is now invalid.
  await expect(page.getByRole("combobox", { name: "Day", exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('[role="combobox"][aria-invalid="true"]')).toHaveCount(1);
});

test("submission validates untouched missing parts", async ({ page }) => {
  await page.goto("/?submit=1&mode=onBlur");
  await choose(page, "Month", "September");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("combobox", { name: "Day", exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("combobox", { name: "Year", exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("requires all three parts and saves an ISO date", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox").locator('[data-slot="select-value"]')).toHaveText(["Month", "Day", "Year"]);
  await choose(page, "Month", "September");
  await choose(page, "Day", "15");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await choose(page, "Year", "2000");
  await expect(page.getByLabel("Saved date")).toHaveText("2000-09-15");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("combobox").locator('[data-slot="select-value"]')).toHaveText(["Month", "Day", "Year"]);
});

test("handles leap days and clears a day that no longer exists", async ({ page }) => {
  await page.goto("/?value=2000-02-29");
  await choose(page, "Year", "2001");
  await expect(page.getByRole("combobox", { name: "Day", exact: true }).locator('[data-slot="select-value"]')).toHaveText("Day");
  await expect(page.getByLabel("Saved date")).toHaveText("No complete date");
  await page.getByRole("combobox", { name: "Day", exact: true }).click();
  await expect(page.getByRole("option", { name: "29", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await choose(page, "Year", "2000");
  await choose(page, "Day", "29");
  await expect(page.getByLabel("Saved date")).toHaveText("2000-02-29");
  await choose(page, "Month", "January");
  await choose(page, "Day", "31");
  await choose(page, "Month", "April");
  await expect(page.getByRole("combobox", { name: "Day", exact: true }).locator('[data-slot="select-value"]')).toHaveText("Day");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});

test("supports keyboard entry and prevents future births", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-14T04:00:00Z"));
  await page.goto("/");
  const month = page.getByRole("combobox", { name: "Month", exact: true });
  await month.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.type("November");
  await expect(page.getByRole("option", { name: "November", exact: true })).toHaveAttribute("data-highlighted", "");
  await expect(page.getByRole("option", { name: "November", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(month.locator('[data-slot="select-value"]')).toHaveText("November");
  await choose(page, "Year", "2026");
  await page.getByRole("combobox", { name: "Day", exact: true }).click();
  await expect(page.getByRole("option", { name: "15", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: "14", exact: true }).click();
  await expect(page.getByLabel("Saved date")).toHaveText("2026-11-14");
  await month.click();
  await expect(page.getByRole("option", { name: "December", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(month).toBeFocused();
});

test("covers both marriage parties and birth-record selection", async ({ page }) => {
  await page.goto("/?kind=marriage");
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).toHaveCount(2);
  await page.goto("/?kind=record");
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).toHaveCount(1);
  await page.getByRole("radio", { name: "death", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).toHaveCount(0);
});

for (const width of [320, 375, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`fits ${width}px in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?theme=${theme}&value=2000-09-15`);
      await expect(page.getByRole("combobox").locator('[data-slot="select-value"]')).toHaveText(["September", "15", "2000"]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await page.getByRole("combobox").all()) {
        expect(await control.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      await page.screenshot({ path: `artifacts/birth-date/${width}-${theme}.png` });
      await page.getByRole("combobox", { name: "Month", exact: true }).click();
      await expect(page.getByRole("option", { name: "September", exact: true })).toBeVisible();
      await page.screenshot({ path: `artifacts/birth-date/${width}-${theme}-open.png` });
    });
  }
}
