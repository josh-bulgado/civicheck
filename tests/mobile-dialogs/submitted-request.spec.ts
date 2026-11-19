import { expect, test, type Page } from "@playwright/test";

async function submit(page: Page, width: number, theme: string, verification: boolean) {
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date("2026-11-14T04:00:00Z"));
  await page.goto(`/?kind=submitted&theme=${theme}${verification ? "&verification=1" : ""}`);
  await page.getByRole("checkbox", { name: /I confirm these details are correct/ }).check();
  await page.getByRole("button", { name: "Submit request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request submitted", exact: true })).toBeVisible();
  await expect(page.getByText("CCRO-2026-860259", { exact: true })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Bring your hard copies for final validation.");
}

for (const width of [320, 375, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`submitted actions fit ${width}px in ${theme}`, async ({ page }) => {
      const verification = width !== 375;
      await submit(page, width, theme, verification);
      const acknowledgment = page.getByRole("button", { name: "Download Acknowledgment PDF", exact: true });
      const verificationForm = page.getByRole("button", { name: "Download Verification Form", exact: true });
      await expect(verificationForm).toHaveCount(verification ? 1 : 0);
      const actions = acknowledgment.locator("..");
      const card = actions.locator("..");
      const cardBounds = await card.boundingBox();
      expect(cardBounds).not.toBeNull();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const actionsBounds = await actions.boundingBox();
      for (const action of await actions.getByRole("button").or(actions.getByRole("link")).all()) {
        const bounds = await action.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(cardBounds!.x);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.width).toBeCloseTo(actionsBounds!.width, 0);
        expect(await action.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      await page.screenshot({ path: `artifacts/mobile-dialogs/submitted-${width}-${theme}.png`, fullPage: true });
      await page.getByRole("link", { name: "View my requests", exact: true }).click();
      await expect(page.getByRole("heading", { name: "My requests", exact: true })).toBeVisible();
    });
  }
}

test.describe("desktop submitted actions", () => {
  test.use({ isMobile: false, hasTouch: false });
  for (const width of [768, 1440]) {
    for (const theme of ["light", "dark"]) {
      test(`retain desktop layout at ${width}px in ${theme}`, async ({ page }) => {
        await submit(page, width, theme, true);
        const acknowledgment = page.getByRole("button", { name: "Download Acknowledgment PDF", exact: true });
        const actions = acknowledgment.locator("..");
        await expect(actions).toHaveCSS("flex-direction", "row");
        for (const action of await actions.getByRole("button").or(actions.getByRole("link")).all()) {
          await expect(action).toHaveCSS("height", "52px");
          await expect(action).toHaveCSS("white-space", "nowrap");
        }
        await page.screenshot({ path: `artifacts/mobile-dialogs/submitted-${width}-${theme}.png`, fullPage: true });
      });
    }
  }
});
